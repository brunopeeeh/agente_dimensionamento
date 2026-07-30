import json
import asyncio
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

# Garante que a raiz do projeto esteja no sys.path para importações do pacote agent_oraculo
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent_oraculo.oraculo_engine import OraculoEngine
from agent_oraculo.tools_dimensionamento import (
    dimensionar_mes_atual,
    dimensionar_mes_futuro,
    calcular_erlang_c_core,
    analisar_gargalos_faixa
)

app = FastAPI(
    title="Oráculo de Dimensionamento API",
    description="Servidor Backend de Inteligência de Dimensionamento Care (Yooga)",
    version="1.0.0"
)

# Habilita CORS para o frontend Vite/TanStack Start
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine_instance = OraculoEngine()

class ChatRequest(BaseModel):
    message: str
    reset_history: Optional[bool] = False

class CalculateRequest(BaseModel):
    tipo: str  # "mes_atual", "mes_futuro", "erlang_c", "gargalos"
    params: Optional[Dict[str, Any]] = {}

@app.get("/api/oraculo/health")
def healthcheck():
    return {"status": "online", "model": "z-ai/glm-5.2", "service": "Oráculo de Dimensionamento"}

@app.post("/api/oraculo/chat")
async def chat_endpoint(request: ChatRequest):
    if request.reset_history:
        engine_instance.reset_conversation()

    def event_generator():
        for event in engine_instance.chat_stream(request.message):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/oraculo/calculate")
def calculate_endpoint(req: CalculateRequest):
    tipo = req.tipo
    params = req.params or {}

    if tipo == "mes_atual":
        return dimensionar_mes_atual(**params)
    elif tipo == "mes_futuro":
        return dimensionar_mes_futuro(**params)
    elif tipo == "erlang_c":
        return calcular_erlang_c_core(**params)
    elif tipo == "gargalos":
        return analisar_gargalos_faixa(**params)
    else:
        raise HTTPException(status_code=400, detail=f"Tipo de cálculo '{tipo}' desconhecido.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("agent_oraculo.api_server:app", host="0.0.0.0", port=8000, reload=True)
