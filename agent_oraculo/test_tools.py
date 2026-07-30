import unittest
from agent_oraculo.tools_dimensionamento import (
    calcular_erlang_c_core,
    dimensionar_mes_atual,
    dimensionar_mes_futuro,
    analisar_gargalos_faixa
)

class TestDimensionamentoTools(unittest.TestCase):

    def test_erlang_c(self):
        res = calcular_erlang_c_core(volume_chamados_hora=100, tma_segundos=300)
        self.assertIn("agentes_necessarios", res)
        self.assertGreater(res["agentes_necessarios"], 0)
        self.assertGreaterEqual(res["sla_alcancado_perc"], 80.0)

    def test_dimensionar_mes_atual(self):
        res = dimensionar_mes_atual(volume_diario_medio=1200)
        self.assertIn("headcount_total_fte_recomendado", res)
        self.assertGreater(res["headcount_total_fte_recomendado"], 0)
        self.assertIn("distribuicao_turnos_recomendada", res)

    def test_dimensionar_mes_futuro(self):
        res = dimensionar_mes_futuro(crescimento_demanda_perc=20.0)
        self.assertIn("novas_contratacoes_necessarias", res)
        self.assertIn("custo_estimado_novas_contratacoes_brl", res)
        self.assertGreaterEqual(res["headcount_futuro_necessario"], res["headcount_atual"])

    def test_analisar_gargalos(self):
        res = analisar_gargalos_faixa("Segunda-feira")
        self.assertEqual(res["dia_semana"], "Segunda-feira")
        self.assertGreater(len(res["faixas_criticas"]), 0)

if __name__ == "__main__":
    unittest.main()
