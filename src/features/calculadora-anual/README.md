# Calculadora de Dimensionamento Anual (Planejamento Futuro)

## Objetivo
Criar um módulo focado em **planejamento a longo prazo (anual/semestral)**. Diferente da "Prova Real" (que foca na escala semanal da equipe atual/simulada), a Calculadora Anual servirá para responder à pergunta: *"Quantas pessoas precisamos contratar este ano para manter o SLA, dado o crescimento projetado?"*

## Inputs Baseados no Histórico e Projeção
- **Volume Médio Histórico de Chamados:** Média de chamados/mês dos últimos X meses.
- **Volume Retido pela IA (Offload):** Percentual de chamados resolvidos pela IA de Atendimento antes de chegar ao humano.
- **Projeção de Crescimento (%):** Expectativa de aumento de volume de clientes (ex: +20% no ano).
- **Tempo Médio de Atendimento (TMA):** Tempo médio histórico em minutos.
- **Absenteísmo & Férias (%):** Margem de segurança para cobrir faltas e férias da equipe anual.
- **AHT (Average Handling Time) / Shrinkage:** Padrões Erlang C para Call Centers.

## Saída Esperada (Output)
- **Sugestão de Headcount Global:** Número total de pessoas necessárias.
- **Contratações Adicionais:** Headcount Atual vs Headcount Necessário.
- **Curva de Contratação:** Sugestão de *quando* contratar as pessoas ao longo do ano para acompanhar a curva de crescimento.

## Arquitetura de Código (Proposta)
`src/features/calculadora-anual/`
- `CalculadoraAnual.tsx` -> View principal da calculadora.
- `useCalculadoraAnual.ts` -> Hook que fará os cálculos de Erlang C e distribuição.
- `CalculadoraContext.tsx` (Opcional) -> Para separar totalmente do contexto atual de prova real.
- `components/` -> Componentes visuais para os inputs e gráficos de curva.

## Integração com a Prova Real (Simulador)
A Calculadora Anual dita o **"O QUÊ"** (ex: "Contrate 5 pessoas").
O Simulador (Prova Real) resolve o **"COMO"** (ex: "Como encaixar essas 5 pessoas na escala 5x2 nos horários de pico").
As duas features são complementares e não devem se misturar diretamente para evitar poluição visual e lógica.
