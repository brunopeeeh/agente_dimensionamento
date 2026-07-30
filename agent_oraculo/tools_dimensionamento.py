import math
from typing import Dict, Any, List

def factorial(n: int) -> float:
    return float(math.factorial(n))

def calcular_erlang_c_core(
    volume_chamados_hora: float,
    tma_segundos: float,
    sla_alvo_segundos: float = 60.0,
    intervalo_min: float = 60.0
) -> Dict[str, Any]:
    """
    Calcula a escala Erlang C mínima necessária para atingir a meta de SLA.
    """
    if volume_chamados_hora <= 0 or tma_segundos <= 0:
        return {
            "agentes_necessarios": 0,
            "ocupacao_perc": 0.0,
            "probabilidade_espera_perc": 0.0,
            "sla_alcancado_perc": 100.0,
            "intensidade_trafego_erlangs": 0.0
        }

    lambda_rate = volume_chamados_hora / (intervalo_min * 60.0)
    mu_rate = 1.0 / tma_segundos
    A = lambda_rate / mu_rate
    m = math.ceil(A) + 1

    while m < 200:
        rho = A / m
        if rho >= 1.0:
            m += 1
            continue

        sum_terms = sum((A ** k) / factorial(k) for k in range(m))
        last_term = ((A ** m) / factorial(m)) * (m / (m - A))
        denom = sum_terms + last_term
        P_w = last_term / denom if denom > 0 else 1.0
        
        sla_calc = 1.0 - (P_w * math.exp(-(m - A) * (sla_alvo_segundos / tma_segundos)))
        sla_perc = max(0.0, min(100.0, sla_calc * 100.0))

        if sla_perc >= 80.0:
            return {
                "agentes_necessarios": m,
                "ocupacao_perc": round(rho * 100, 2),
                "probabilidade_espera_perc": round(P_w * 100, 2),
                "sla_alcancado_perc": round(sla_perc, 2),
                "intensidade_trafego_erlangs": round(A, 2)
            }
        m += 1

    return {
        "agentes_necessarios": m,
        "ocupacao_perc": round((A / m) * 100, 2),
        "probabilidade_espera_perc": 100.0,
        "sla_alcancado_perc": 0.0,
        "intensidade_trafego_erlangs": round(A, 2)
    }

def dimensionar_mes_atual(
    volume_diario_medio: int = 1200,
    tma_webchat_min: float = 16.5,
    tma_whatsapp_min: float = 13.0,
    meta_sla_webchat: float = 85.0,
    shrinkage_absenteismo_perc: float = 20.0
) -> Dict[str, Any]:
    """
    Executa o dimensionamento completo para o mês atual considerando 20h de operação
    (07:00 as 03:00), concorrência de 3 Webchat / 4 Whatsapp e fator de escala 5x2.
    """
    # 20 horas de operação = 1200 minutos por dia.
    # Volume total em horas de trabalho (Workload):
    # Webchat representa ~65% dos chamados e WhatsApp ~35%.
    vol_web = volume_diario_medio * 0.65
    vol_whats = volume_diario_medio * 0.35

    # Horas totais de atendimento requeridas por dia:
    horas_atendimento_web = (vol_web * tma_webchat_min) / 60.0
    horas_atendimento_whats = (vol_whats * tma_whatsapp_min) / 60.0

    # Considerando concorrência efetiva (3 Web / 4 Whats):
    horas_agente_web = horas_atendimento_web / 3.0
    horas_agente_whats = horas_atendimento_whats / 4.0
    horas_agente_liquidas_dia = horas_agente_web + horas_agente_whats

    # Carga de trabalho de 1 FTE em escala 5x2 (jornada útil diária de ~6h produtivas):
    jornada_produtiva_diaria_fte = 6.0
    
    # Agentes líquidos simultâneos em pico (pico requer ~1.6x da média):
    agentes_liquidos_pico = math.ceil((horas_agente_liquidas_dia / 20.0) * 1.6)

    # Total de FTEs líquidos para cobrir as 20h nos 7 dias da semana:
    # Cobertura semanal: (horas líquidas diárias * 7 dias) / (40 horas semanais por FTE)
    fte_liquidos_semana = math.ceil((horas_agente_liquidas_dia * 7.0) / 36.0)
    
    # Garantir que a equipe consiga cobrir os picos em 3 turnos
    fte_liquidos = max(fte_liquidos_semana, math.ceil(agentes_liquidos_pico * 1.8))

    # Aplicação do Shrinkage (folgas, feriados, absenteísmo e treinamento)
    factor_shrinkage = 1.0 / (1.0 - (shrinkage_absenteismo_perc / 100.0))
    headcount_fte_total = math.ceil(fte_liquidos * factor_shrinkage)

    return {
        "mes": "Atual",
        "volume_diario_medio": volume_diario_medio,
        "volume_mensal_estimado": volume_diario_medio * 30,
        "tma_webchat_min": tma_webchat_min,
        "tma_whatsapp_min": tma_whatsapp_min,
        "agentes_simultaneos_pico": agentes_liquidos_pico,
        "shrinkage_aplicado_perc": shrinkage_absenteismo_perc,
        "headcount_total_fte_recomendado": headcount_fte_total,
        "distribuicao_turnos_recomendada": {
            "Turno 1 - Manhã (07:00 - 15:20)": math.ceil(headcount_fte_total * 0.35),
            "Turno 2 - Tarde/Pico (13:00 - 21:20)": math.ceil(headcount_fte_total * 0.45),
            "Turno 3 - Coruja (18:40 - 03:00)": math.ceil(headcount_fte_total * 0.20)
        },
        "capacidade_maxima_chamados_dia": round((headcount_fte_total * (1 - shrinkage_absenteismo_perc/100) * 6.0 * 60) / ((tma_webchat_min/3)*0.65 + (tma_whatsapp_min/4)*0.35), 0)
    }

def dimensionar_mes_futuro(
    crescimento_demanda_perc: float = 15.0,
    mes_target: str = "Próximo Mês",
    custo_medio_fte_brl: float = 3500.0,
    volume_atual_diario: int = 1200,
    headcount_atual: int = 24
) -> Dict[str, Any]:
    """
    Calcula a projeção e planejamento de contratações para meses futuros.
    """
    volume_futuro_diario = math.ceil(volume_atual_diario * (1.0 + (crescimento_demanda_perc / 100.0)))
    
    # Recalcula mês futuro com a nova demanda
    res_futuro = dimensionar_mes_atual(volume_diario_medio=volume_futuro_diario)
    headcount_futuro_necessario = res_futuro["headcount_total_fte_recomendado"]
    
    novas_contratacoes = max(0, headcount_futuro_necessario - headcount_atual)
    custo_adicional_mensal = novas_contratacoes * custo_medio_fte_brl

    return {
        "mes_alvo": mes_target,
        "percentual_crescimento": crescimento_demanda_perc,
        "volume_diario_projetado": volume_futuro_diario,
        "volume_mensal_projetado": volume_futuro_diario * 30,
        "headcount_atual": headcount_atual,
        "headcount_futuro_necessario": headcount_futuro_necessario,
        "novas_contratacoes_necessarias": novas_contratacoes,
        "custo_estimado_novas_contratacoes_brl": round(custo_adicional_mensal, 2),
        "distribuicao_turnos_projetada": res_futuro["distribuicao_turnos_recomendada"]
    }

def analisar_gargalos_faixa(dia_semana: str = "Segunda-feira") -> Dict[str, Any]:
    """
    Identifica os horários críticos de pico de atendimento por dia da semana.
    """
    gargalos = [
        {"faixa": "11:30 - 13:30", "motivo": "Pico de almoço nos restaurantes. Volume Webchat +60% acima da média.", "nivel_critico": "ALTO"},
        {"faixa": "18:30 - 21:30", "motivo": "Pico de abertura de jantar e entregas. Volume Webchat +85% acima da média.", "nivel_critico": "CRÍTICO"},
        {"faixa": "22:30 - 00:30", "motivo": "Fechamento de caixa e conciliação fiscal. Dúvidas de fechamento do sistema.", "nivel_critico": "MÉDIO"}
    ]
    
    return {
        "dia_semana": dia_semana,
        "faixas_criticas": gargalos,
        "recomendacao_acao": "Reforçar a escala intermediária (13:00 às 21:20) e manter transbordamento de Webchat liberado automaticamente para o WhatsApp."
    }

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "calcular_erlang_c",
            "description": "Calcula a probabilidade de espera, nível de serviço (SLA) e número mínimo de atendentes necessários baseado na teoria das filas Erlang C.",
            "parameters": {
                "type": "object",
                "properties": {
                    "volume_chamados_hora": {"type": "number", "description": "Volume médio de chamados por hora."},
                    "tma_segundos": {"type": "number", "description": "Tempo Médio de Atendimento (TMA) em segundos."},
                    "sla_alvo_segundos": {"type": "number", "description": "Tempo limite do SLA em segundos (padrão 60s)."},
                    "intervalo_min": {"type": "number", "description": "Janela de tempo em minutos (padrão 60)."}
                },
                "required": ["volume_chamados_hora", "tma_segundos"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "dimensionar_mes_atual",
            "description": "Executa o cálculo completo de dimensionamento de suporte para o mês atual, retornando o headcount (FTEs) necessário e sugestão de turnos.",
            "parameters": {
                "type": "object",
                "properties": {
                    "volume_diario_medio": {"type": "integer", "description": "Volume médio diário de chamados no mês (ex: 1200)."},
                    "tma_webchat_min": {"type": "number", "description": "TMA médio no Webchat em minutos (padrão 16.5)."},
                    "tma_whatsapp_min": {"type": "number", "description": "TMA médio no WhatsApp em minutos (padrão 13.0)."},
                    "meta_sla_webchat": {"type": "number", "description": "Meta de SLA percentual no Webchat (padrão 85.0)."},
                    "shrinkage_absenteismo_perc": {"type": "number", "description": "Percentual de folgas, absenteísmo e perdas (padrão 20.0)."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "dimensionar_mes_futuro",
            "description": "Calcula a projeção de dimensionamento, contratações necessárias e custos para um mês futuro com base em percentual de crescimento.",
            "parameters": {
                "type": "object",
                "properties": {
                    "crescimento_demanda_perc": {"type": "number", "description": "Percentual de crescimento previsto da demanda (ex: 15.0)."},
                    "mes_target": {"type": "string", "description": "Nome do mês alvo (ex: Próximo Mês, Agosto/2026)."},
                    "custo_medio_fte_brl": {"type": "number", "description": "Custo médio mensal por atendente contratado em R$ (padrão 3500.0)."},
                    "volume_atual_diario": {"type": "integer", "description": "Volume atual diário de chamados (padrão 1200)."},
                    "headcount_atual": {"type": "integer", "description": "Quantidade atual de atendentes na equipe (padrão 24)."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analisar_gargalos_faixa",
            "description": "Retorna uma análise detalhada das faixas de horário críticas e gargalos de atendimento do Care.",
            "parameters": {
                "type": "object",
                "properties": {
                    "dia_semana": {"type": "string", "description": "Dia da semana para analisar (ex: Segunda-feira)."}
                }
            }
        }
    }
]

AVAILABLE_FUNCTIONS = {
    "calcular_erlang_c": lambda args: calcular_erlang_c_core(**args),
    "dimensionar_mes_atual": lambda args: dimensionar_mes_atual(**args),
    "dimensionar_mes_futuro": lambda args: dimensionar_mes_futuro(**args),
    "analisar_gargalos_faixa": lambda args: analisar_gargalos_faixa(**args)
}
