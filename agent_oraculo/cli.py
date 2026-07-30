import sys
import os
from pathlib import Path

# Garante que a raiz do projeto esteja no sys.path para importações do pacote agent_oraculo
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from agent_oraculo.oraculo_engine import OraculoEngine

_USE_COLOR = sys.stdout.isatty() and os.getenv("NO_COLOR") is None
_CYAN = "\033[96m" if _USE_COLOR else ""
_GREEN = "\033[92m" if _USE_COLOR else ""
_YELLOW = "\033[93m" if _USE_COLOR else ""
_GRAY = "\033[90m" if _USE_COLOR else ""
_RESET = "\033[0m" if _USE_COLOR else ""

def main():
    print(f"{_CYAN}===================================================={_RESET}")
    print(f"{_CYAN} 🔮 ORÁCULO DE DIMENSIONAMENTO CARE — YOOGA ASSISTANT {_RESET}")
    print(f"{_CYAN} Modelo: NVIDIA GLM-5.2 | Suporte & WFM Intelligence {_RESET}")
    print(f"{_CYAN} Comandos: /reset (limpa memória), /exit (sair) {_RESET}")
    print(f"{_CYAN}====================================================\n{_RESET}")

    engine = OraculoEngine()

    while True:
        try:
            user_input = input(f"{_GREEN}Você > {_RESET}").strip()
            if not user_input:
                continue

            if user_input.lower() in ["/exit", "sair", "exit"]:
                print(f"{_CYAN}Encerrando sessão do Oráculo. Até logo!{_RESET}")
                break

            if user_input.lower() == "/reset":
                engine.reset_conversation()
                print(f"{_YELLOW}Memória da sessão reiniciada.{_RESET}\n")
                continue

            print(f"\n{_CYAN}Oráculo > {_RESET}", end="", flush=True)

            for chunk in engine.chat_stream(user_input):
                chunk_type = chunk.get("type")
                chunk_data = chunk.get("data")

                if chunk_type == "tool_call":
                    if chunk_data.get("status") == "completed":
                        fn_name = chunk_data.get("name")
                        result = chunk_data.get("result")
                        print(f"\n{_GRAY}⚙️ [Ferramenta de Cálculo '{fn_name}' executada com sucesso]{_RESET}", flush=True)
                        print(f"{_CYAN}Oráculo > {_RESET}", end="", flush=True)

                elif chunk_type == "content":
                    print(chunk_data, end="", flush=True)

            print("\n")

        except KeyboardInterrupt:
            print(f"\n{_CYAN}Sessão interrompida.{_RESET}")
            break
        except Exception as e:
            print(f"\n{_YELLOW}Erro na sessão: {e}{_RESET}\n")

if __name__ == "__main__":
    main()
