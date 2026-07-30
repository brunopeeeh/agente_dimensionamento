import os
import json
import sys
from typing import List, Dict, Any, Generator
from openai import OpenAI
from pathlib import Path

# Carrega .env se python-dotenv estiver disponível
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

from agent_oraculo.system_prompt import load_system_prompt
from agent_oraculo.tools_dimensionamento import TOOLS_SCHEMA, AVAILABLE_FUNCTIONS

class OraculoEngine:
    def __init__(self, api_key: str = None, model: str = "z-ai/glm-5.2"):
        self.api_key = api_key or os.getenv("NVIDIA_API_KEY")
        if not self.api_key:
            # Tentar ler direto do arquivo .env como fallback
            env_file = Path(__file__).parent.parent / ".env"
            if env_file.exists():
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("NVIDIA_API_KEY="):
                            self.api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                            break
        
        self.base_url = "https://integrate.api.nvidia.com/v1"
        self.model = model
        
        self.client = OpenAI(
            base_url=self.base_url,
            api_key=self.api_key or "fake-key-for-test"
        )
        self.system_prompt = load_system_prompt()
        self.conversation_history: List[Dict[str, Any]] = [
            {"role": "system", "content": self.system_prompt}
        ]

    def reset_conversation(self):
        """Reinicia o histórico mantendo apenas o system prompt."""
        self.conversation_history = [{"role": "system", "content": self.system_prompt}]

    def chat_stream(self, user_message: str) -> Generator[Dict[str, Any], None, None]:
        """
        Processa a mensagem do usuário via streaming e tool calling.
        Emite eventos em dicionário:
        - {"type": "content", "data": "texto..."}
        - {"type": "tool_call", "data": {"name": "...", "args": {...}, "result": {...}}}
        """
        self.conversation_history.append({"role": "user", "content": user_message})

        try:
            # Primeira chamada (verificando se o modelo deseja chamar alguma ferramenta)
            response = self.client.chat.completions.create(
                model=self.model,
                messages=self.conversation_history,
                tools=TOOLS_SCHEMA,
                tool_choice="auto",
                temperature=0.7,
                top_p=1.0,
                max_tokens=4096,
                stream=False  # Não stream para tool calls iniciais para tratar a lógica de ferramentas com precisão
            )

            response_message = response.choices[0].message

            # Se o modelo optou por chamar ferramentas (Tool Calling)
            if response_message.tool_calls:
                self.conversation_history.append(response_message)
                
                for tool_call in response_message.tool_calls:
                    fn_name = tool_call.function.name
                    fn_args_str = tool_call.function.arguments
                    try:
                        fn_args = json.loads(fn_args_str)
                    except Exception:
                        fn_args = {}

                    yield {
                        "type": "tool_call",
                        "data": {
                            "name": fn_name,
                            "args": fn_args,
                            "status": "executing"
                        }
                    }

                    # Executa a função localmente
                    if fn_name in AVAILABLE_FUNCTIONS:
                        fn_result = AVAILABLE_FUNCTIONS[fn_name](fn_args)
                    else:
                        fn_result = {"error": f"Ferramenta {fn_name} não encontrada."}

                    yield {
                        "type": "tool_call",
                        "data": {
                            "name": fn_name,
                            "args": fn_args,
                            "result": fn_result,
                            "status": "completed"
                        }
                    }

                    # Adiciona a resposta da ferramenta ao histórico
                    self.conversation_history.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(fn_result, ensure_ascii=False)
                    })

                # Segunda chamada para gerar a resposta final formatada após as ferramentas
                stream_response = self.client.chat.completions.create(
                    model=self.model,
                    messages=self.conversation_history,
                    temperature=0.7,
                    max_tokens=4096,
                    stream=True
                )

                full_content = ""
                for chunk in stream_response:
                    if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                        content_delta = chunk.choices[0].delta.content
                        full_content += content_delta
                        yield {"type": "content", "data": content_delta}

                self.conversation_history.append({"role": "assistant", "content": full_content})

            else:
                # Se não usou ferramentas, fazemos o streaming direto da resposta
                # Como a primeira resposta não foi streamed, enviamos o conteúdo gerado:
                content = response_message.content or ""
                self.conversation_history.append({"role": "assistant", "content": content})
                yield {"type": "content", "data": content}

        except Exception as e:
            error_msg = f"\n⚠️ [Erro ao comunicar com a API NVIDIA]: {str(e)}"
            yield {"type": "content", "data": error_msg}
