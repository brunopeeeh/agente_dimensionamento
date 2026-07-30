# DOCUMENTO MESTRE DE NEGÓCIO E DIMENSIONAMENTO — YOOGA CARE

> **Status:** Documento Oficial de Referência do Oráculo de IA  
> **Aplicação:** Yooga Suporte / Care — Planejamento Operacional, WFM e Forecast

---

## 1. CONTEXTO E MODELO DE NEGÓCIO DO CARE YOOGA

O **Care (Suporte) da Yooga** opera um cockpit de atendimento ao cliente em regime estendido de **20 horas por dia (das 07:00 às 03:00)** no dia seguinte.
O suporte atende clientes de restaurantes e estabelecimentos comerciais utilizando um ecossistema de multi-canais com priorização rigorosa:

### 1.1 Filas de Atendimento e Prioridade
1. **Webchat (Fila Prioritária):**
   - Atendimento síncrono no sistema web da Yooga.
   - Meta de SLA: Atendimento imediato em até 60 segundos.
   - Concorrência média permitida por agente: **3 chats simultâneos**.
   - Toda a força de trabalho ativa no bloco de tempo é primeiramente alocada ao Webchat.

2. **WhatsApp (Fila Secundária / Transbordamento):**
   - Atendimento assíncrono / semi-síncrono.
   - Meta de SLA: Resposta em até 300 segundos (5 minutos).
   - Concorrência média por agente: **4 chats simultâneos**.
   - Recebe **apenas** o excedente (overflow) de capacidade dos agentes que ficaram ociosos na fila de Webchat.

---

## 2. METODOLOGIA DE CÁLCULO E REGRAS DE DIMENSIONAMENTO

O planejamento de escalas e dimensionamento é processado em blocos consecutivos de **10 minutos** (144 faixas por dia de operação de 20h).

### 2.1 Regra de Transbordamento (Overflow)
Para cada faixa de 10 minutos \(t\):
1. **Capacidade Unitária Webchat (\(Cap_{unit,web}\)):**
   $$Cap_{unit,web} = \frac{10 \text{ min}}{TMA_{web} \text{ (min)}} \times 3 \text{ (simultâneos)}$$
2. **Capacidade Total Webchat (\(Cap_{raw,web}\)):**
   $$Cap_{raw,web} = \text{Agentes Ativos} \times Cap_{unit,web}$$
   $$\text{Capacidade Arredondada Webchat} = \text{ROUND}(Cap_{raw,web}, 0)$$
3. **Sobra / Déficit de Webchat (\(Sobra_{web}\)):**
   $$Sobra_{web} = \text{Capacidade Arredondada Webchat} - \text{Demand}_{web}$$
4. **Liberação de Agentes para WhatsApp (\(Agentes_{whats}\)):**
   - Se \(Sobra_{web} \le 0\), então \(Agentes_{whats} = 0\).
   - Se \(Sobra_{web} > 0\), então:
     $$Agentes_{whats} = \lfloor \frac{Sobra_{web}}{3} \rfloor$$
5. **Capacidade WhatsApp (\(Cap_{whats}\)):**
   $$Cap_{unit,whats} = \frac{10 \text{ min}}{TMA_{whats} \text{ (min)}} \times 4 \text{ (simultâneos)}$$
   $$Cap_{raw,whats} = Agentes_{whats} \times Cap_{unit,whats}$$
   $$\text{Capacidade Arredondada WhatsApp} = \text{ROUND}(Cap_{raw,whats}, 0)$$
6. **Sobra / Déficit de WhatsApp (\(Sobra_{whats}\)):**
   $$Sobra_{whats} = \text{Capacidade Arredondada WhatsApp} - \text{Demand}_{whats}$$
7. **Agentes Faltantes / Contratações Necessárias (\(FTE_{faltantes}\)):**
   - Se \(Sobra_{whats} \ge 0\), Déficit = 0.
   - Se \(Sobra_{whats} < 0\), o Déficit de chats é \(|Sobra_{whats}|\):
     $$FTE_{faltantes} = \lceil \frac{Déficit}{4} \rceil$$

---

## 3. MODELAGEM MATEMÁTICA ERLANG C (WFM AVANÇADO)

Para calcular o dimensionamento ideal considerando probabilidade de espera e SLA alvo, o Oráculo utiliza a fórmula **Erlang C**:

### 3.1 Parâmetros Erlang C
- \(A\) (Intensidade de Tráfego em Erlangs):
  $$A = \lambda \times \text{TMA (em horas)}$$
  onde \(\lambda\) é a taxa de chegada de chamados por hora.
- \(m\) (Número de Atendentes Ativos).
- \(\rho\) (Taxa de Ocupação dos Atendentes):
  $$\rho = \frac{A}{m} < 1$$
- **Probabilidade de Espera (\(P_w\)):**
  $$P_w = \frac{\frac{A^m}{m!} \frac{m}{m - A}}{\left( \sum_{k=0}^{m-1} \frac{A^k}{k!} \right) + \frac{A^m}{m!} \frac{m}{m - A}}$$
- **SLA Alcançado (\(SLA_{calc}\)):**
  $$SLA_{calc} = 1 - P_w \times e^{-(m - A) \times \frac{T_{sla}}{TMA}}$$
  onde \(T_{sla}\) é o tempo alvo de SLA (ex: 60s no Webchat).

---

## 4. PREMISSAS DE TMA E SAZONALIDADE

- **TMA Médio Histórico no Webchat:** ~16 a 18 minutos por chamado.
- **TMA Médio Histórico no WhatsApp:** ~12 a 14 minutos por chamado.
- **Picos de Demanda na Semana:**
  - Segunda-feira e Sexta-feira: Maior volume de abertura de chamados (+20% em relação à média).
  - Horários de Pico: Almoço (11:30 às 14:00) e Jantar (18:30 às 22:30).
- **Fator de Absenteísmo / Shrinkage:** 15% a 20% sobre o total da escala nominal para compensar folgas (escala 5x2 ou 6x1), reuniões e treinamentos.

---

## 5. INSTRUÇÕES DO ORÁCULO DE DIMENSIONAMENTO

1. **Precisão Matemática:** Sempre execute os cálculos via ferramentas (`tools_dimensionamento`) antes de responder números de contratação ou déficit.
2. **Recomendações Práticas:** Ao identificar déficits em faixas horárias, sugira remanejamento de turnos antes de recomendar novas contratações.
3. **Visão de Custos:** Considere que cada contratação adicional (FTE) possui custo médio de remuneração + encargos operacionais.
4. **Tom de Voz:** Denso, direto, profissional e orientado a dados (voz Yooga: "gestão suave", direto, prático, sem jargão corporativo).
