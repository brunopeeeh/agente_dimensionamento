# 🚀 Documentação de Entrega e Estado do Projeto (Project Handover)

> **Yooga — Planejamento Operacional e Inteligência de Atendimento**
> **Última Atualização:** Maio de 2026
> **Propósito:** Servir como única fonte de verdade e guia técnico para qualquer programador ou agente de IA que assumir o projeto a partir deste ponto, detalhando todo o histórico de melhorias, regras de negócios implementadas e a situação atual do sistema.

---

## 📌 1. Visão Geral do Projeto

Este projeto é uma ferramenta de **Dimensionamento de Escala e Capacity de Atendimento** (Care e Suporte) desenvolvida para a Yooga. A aplicação calcula a escala de analistas humanos, projeta transbordos prioritários de Webchat para WhatsApp, calcula déficits e simula novos cenários operacionais, alinhando-se perfeitamente com os dados históricos e restrições operacionais da empresa.

---

## 🛠️ 2. Resumo das Melhorias e Recursos Implementados

Consolidamos abaixo todas as melhorias e correções feitas na arquitetura de código, fórmulas de cálculo e interface de usuário para garantir fidelidade de 100% com as regras do Excel e alta usabilidade.

### 2.1 Mapeamento Dinâmico de Analistas no Capacity

- **Como funcionava antes:** A visualização na tabela "Capacity por Agente" era baseada em dados mockados e estáticos extraídos diretamente do JSON inicial.
- **O que foi implementado:**
  - As linhas da tabela de capacidade (`humanRows`) agora são derivadas dinamicamente da lista de agentes ativos da escala geral (`teamAgents`).
  - Implementamos um fallback inteligente: novos agentes cadastrados que não possuíam volume trimestral histórico no Excel padrão recebem automaticamente a média padrão de **1500**.
  - As edições são salvas de forma persistente no `localStorage` sob a chave `yooga_capacity_agents` no contexto do React (`DimensionamentoContext.tsx`).

### 2.2 Divisor Dinâmico Inteligente (Visão Geral vs Visão Diária)

- **O que foi implementado:**
  - Criamos o seletor `currentDivisor` em [AgentCapacity.tsx](file:///c:/Users/User%20Yooga/Documents/PROJETOS/Dimensionamento_novo/src/components/AgentCapacity.tsx) que ajusta a matemática dinamicamente dependendo da aba selecionada:
    - **Aba "Visão Geral" (`Todos`):** Utiliza o tamanho total da equipe de analistas humanos ativos (**12 analistas**), dividindo os volumes agregados por `13` (para Capacity, 20min e Webchat) ou `14` (para Capacity/Tag). Isso mantém a compatibilidade exata com as planilhas estáticas do Excel de planejamento macro.
    - **Abas Diárias (`Segunda` a `Domingo`):** Utiliza a quantidade de analistas escalados/trabalhando **naquele dia específico** (`humanAgentsFiltered.length`). Por exemplo, se no domingo apenas 6 analistas trabalham, o divisor dinâmico passa a ser `6 + 1 = 7`. Isso fornece um cálculo real e acurado para a operação cotidiana de cada dia.

### 2.3 Paridade de Fórmulas e Valores com o Excel Original

- **O que foi corrigido:**
  - Removemos o fator multiplicador diário `tmaFactor` das equações de capacidade síncrona (**Capacity/20min** e **Capacity/Webchat**).
  - Com essa alteração, eliminamos uma discrepância onde o aplicativo exibia valores inflados (ex: `4.06` e `2.03`) e restabelecemos a **fidelidade matemática absoluta** com o Excel original, exibindo exatamente **`2.65`** e **`1.33`**.
  - A fórmula do **Capacity/Whats** foi fixada exatamente como:
    $$\text{Capacity/Whats} = \frac{\text{Capacity/Webchat} \times 4}{3}$$

### 2.4 Casamento Inteligente de Nomes (Name Matching Bug Fix)

- **O que foi corrigido:**
  - Havia um travamento de input onde o usuário tentava editar a média de agentes com nomes longos (ex: `Romerio Barbosa de Oliveira Júnior`) e a edição não persistia devido a falhas na correspondência estrita de strings com o nome curto da planilha (`Romério`).
  - Centralizamos as funções de normalização (`normalizeName`) e de correspondência de strings (`matchAgentName`) no contexto (`DimensionamentoContext.tsx`) e as importamos no componente de exibição.
  - O algoritmo agora remove acentos, espaços e caracteres especiais para casar perfeitamente as strings operacionais de ambas as bases de dados.

### 2.5 Edição Inline de Yooga Suporte (Tecnologia) e Care IA

- **O que foi implementado:**
  - Modificamos a tabela de capacidade para tornar os volumes trimestrais (`Média / Tri`) de **Yooga Suporte** e **Care IA** totalmente editáveis através de inputs numéricos inline integrados.
  - Removemos a duplicação de fórmulas matemáticas pesadas no JSX. Agora, ambas as linhas atualizam diretamente seus volumes por meio do método `updateCapacityAgent`, acionando as fórmulas reativas pré-calculadas e unificadas (`mediaMes`, `resolvidosDia`, `resolvidosHora`, `resolvidos20`, `resolvidos10`) em tempo de execução, com salvamento no `localStorage`.

### 2.6 Redesenho Premium de UI/UX (Aesthetics Overhaul)

- **O que foi implementado:**
  - Substituímos a exibição simplória de métricas por uma interface premium de alta fidelidade visual (SaaS Premium), em total harmonia com o tema padrão da aplicação (sem uso de violeta puro, respeitando o _Purple Ban_ e o layout de design customizado).
  - **Cards Premium do Topo:** Três cards dinâmicos que exibem o tamanho da **Equipe Care**, os resolvidos/dia do **Yooga Suporte** e do **Care AI**.
  - **Cápsulas Horizontais de Métricas:** Um conjunto moderno de cápsulas cinza-claro integradas que exibem de forma consolidada os KPIs de capacidade calculados.
  - **Visualização Contextual:**
    - Na **Visão Geral**, exibimos todas as 5 métricas de capacidade disponíveis (`Capacity`, `Capacity/Tag`, `Capacity/20min`, `Capacity/Webchat` e `Capacity/Whats`).
    - Nas **Abas Diárias**, o painel oculta automaticamente as métricas macro desnecessárias e foca exclusivamente nas métricas utilizadas na operação diária de segunda a domingo: `Capacity/Webchat` e `Capacity/Whats`.
  - **UI Limpa:** Removemos caixas pretas obsoletas de console de depuração no rodapé.

### 2.7 Flexibilidade de Escala e Regras de Negócio de Offchat

- **O que foi implementado:**
  - Habilitamos o agendamento de múltiplos analistas simultâneos em tarefas externas/Offchat (`externo`) para qualquer dia da semana (Segunda a Domingo).
  - Corrigimos o contador da grade de escalas para que células marcadas como `"externo"` (azuis) fiquem visualmente limpas (removendo o número `"1"` que poluía a tela) e **não somem** no total de agentes ativos na fila de atendimento (`activeCount`).
  - Ajustamos o critério de desempate de ordenação de agentes com a mesma hora de entrada na escala diária para ordenar prioritariamente quem possui horário de almoço mais cedo.

### 2.8 Fatores de TMA/Capacity Diários Dinâmicos e Reativos

- **Como funcionava antes:** O motor de cálculos de cascata do Webchat e WhatsApp usava fatores estáticos importados do Excel para cada dia da semana (ex: Segunda a `1.63`), o que ignorava alterações no capacity trimestral individual ou mudanças de escala feitas dinamicamente.
- **O que foi implementado:**
  - Criamos o `dynamicTmaFactors` no contexto do React. Esse mecanismo calcula de forma 100% dinâmica o `Capacity/Webchat` real de cada dia da semana baseado nos analistas humanos agendados no dia, em suas médias da primeira aba, e nas produtividades do Yooga Suporte e Care IA.
  - Integramos esses fatores no motor de transbordo (`rowCalculations`) e no Context Provider, fazendo com que todos os cálculos de Webchat por horário, WhatsApp, Prova Real e déficits se recalculem em tempo real.
  - Configuramos as grades horárias das abas Webchat, WhatsApp e Prova Real para abrir por padrão na visualização de **Capacity** (View ID `capacity`), permitindo verificar de imediato a capacidade operacional baseada na escala ativa (ex: `1.65` na segunda-feira pela manhã com 1 agente).

### 2.9 Customização de Visões e Agentes para WhatsApp na Fila Webchat

- **O que foi implementado:**
  - **Ocultação de Faltam (20min)**: Removemos totalmente a aba "Faltam (20min)" na aba de Webchat, uma vez que o Webchat não gera déficit deste tipo.
  - **Renomeação de Faltam (10min)**: Renomeamos a aba "Faltam (10min)" para **"Agentes para o Whatsapp"** especificamente no contexto do Webchat.
  - **Mapeamento Matemático de Sobra**: Os valores de "Agentes para o Whatsapp" exibidos por horário correspondem aos agentes inteiros liberados (`agentsWhats` calculado na cascata de transbordo do contexto). Essa lógica pega a sobra de chats no Webchat (`resultado`) e divide por 3, arredondando para baixo:
    $$\text{Agentes Liberados} = \lfloor \frac{\text{Resultado (Sobra Webchat)}}{3} \rfloor$$
  - **Visualização Positiva**: Substituímos os estilos de alerta vermelho de déficit por um badge verde clarinho (emerald) positivo e amigável (`text-emerald-600 bg-emerald-500/10`) nas células para representar capacidade disponível e liberada.
  - **Simplificação e Limpeza da Grade de Horários (Remoção total dos cards superiores)**: Removemos totalmente o painel com todos os cards de KPI superiores (`Volume total / semana`, `Capacity total / semana` e `Agentes faltantes / p/ WhatsApp` / `Total Agentes p/ WhatsApp`) de todas as abas das grades horárias (Webchat, WhatsApp e Prova Real) por solicitação de design operacional. Isso proporcionou uma interface extremamente limpa, direta e 100% focada no grid de dados horários.
  - **Exibição Numérica Limpa (Substituição de Traço por Zero)**: Células com valor igual a zero em qualquer visualização de agentes (tanto no Webchat quanto no WhatsApp/Prova Real) agora exibem de forma explícita o número `0` em um pequeno badge. Para maior nitidez e contraste elegante, a borda do badge e o numeral utilizam um tom cinza-escuro (`border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400`), facilitando a leitura rápida de lacunas na escala.
  - **Mapa de Calor Dinâmico (Heatmap em Resultado)**: Na visualização de Resultados, implementamos um gradiente inteligente de cores de fundo. Quanto maior o excedente positivo, mais intensa é a cor verde esmeralda de fundo da célula. Quanto maior o déficit negativo, mais intensa é a cor vermelha de fundo, facilitando a identificação imediata das maiores lacunas de escala e dos momentos de ociosidade saudável.

### 2.10 Gráficos de Resultados e Comparativos Operacionais Lado a Lado Sincronizados

- **O que foi implementado:**
  - **Gráfico de Resultado WhatsApp**: Na aba **WhatsApp**, implementamos um gráfico de barras dinâmico utilizando a biblioteca **Recharts**, idêntico ao modelo do Excel original. O gráfico exibe os excedentes (acima de zero) e os déficits (abaixo de zero) medidos em equivalência de analistas (Agentes) para cada horário do dia.
  - **Redesenho Completo da Visão Geral (Sincronização Lado a Lado de Alta Legibilidade)**: Na aba principal **Visão Geral**, redesenhamos inteiramente a interface de gráficos para otimizar drasticamente a visualização:
    - **Layout em Grid de Duas Colunas**: Dividimos o gráfico unificado congestionado em dois gráficos independentes dispostos lado a lado (`grid grid-cols-1 lg:grid-cols-2 gap-6`). O gráfico da esquerda exibe o **WhatsApp Original** (curva azul sólida `#3b82f6`) e o da direita exibe a **Prova Real** simulando as contratações (curva verde sólida `#10b981`).
    - **Sincronização de Cursor e Hover (syncId)**: Integramos o parâmetro `syncId="whatsAppComparison"` do Recharts. Ao passar o mouse por cima de um ponto horário em um dos gráficos, a linha guia vertical do cursor e o tooltip detalhado são exibidos no gráfico oposto simultaneamente em tempo real, permitindo comparar instantaneamente o surplus/déficit de agentes.
    - **Espessura de Barras e Legibilidade Superior**: Ajustamos a largura de barra para `barSize={3.5}` e o espaçamento categórico para `barCategoryGap={1}`. Ao isolar cada série em seu próprio gráfico, a densidade é reduzida pela metade e as barras ficam espessas, nítidas, contrastadas e de leitura extremamente confortável.
    - **Controles Sincronizados de Dias**: Cada card possui um controle rápido de dias da semana (Segunda a Domingo) perfeitamente sincronizado. Selecionar o dia em qualquer gráfico atualiza automaticamente ambos instantaneamente com dados reativos e transições animadas suaves.
    - **Filtro de Horários Operacionais (07:00 às 00:00)**: Limitamos o conjunto de dados exibido em ambos os gráficos da Visão Geral para cobrir estritamente a janela de atendimento operacional (`07:00` às `00:00`). Qualquer intervalo de madrugada não operacional (como `00:10` a `06:50`) é filtrado automaticamente, eliminando espaços vazios desnecessários e focando 100% no horário de maior impacto da escala.
    - **Interface Simplificada (Remoção de Sliders e TMA)**: Por solicitação operacional, removemos totalmente os painéis inferiores de "Ajuste de SLA & Conexões" (controles deslizantes de simultaneidade) e de "Multiplicadores de TMA Ponderado por Dia". Isso resultou em um painel Visão Geral extremamente limpo, focado e direto na análise comparativa lado a lado.
  - **Paridade Absoluta com o Excel**: O cálculo do Resultado para WhatsApp e Prova Real no contexto agora deduz com precisão decimal o volume dividido pelo TMA do dia (equivalência de agentes), gerando os mesmos números exatos exibidos em sua planilha padrão (ex: `1.61538` ou `-0.07692`).

---

## 📐 3. Fluxo de Cascata Operacional das Fórmulas

Para qualquer analista de IA ou desenvolvedor, este é o fluxo de dados sequencial que rege a lógica de transbordo e cálculo do Capacity Geral e KPIs:

```mermaid
graph TD
    A[Agentes Ativos na Escala] -->|Mapeamento| B(Fila Prioritária: Webchat)
    B -->|Cálculo de Capacidade| C[Capacidade Webchat Bruta = Agentes * Fator_Dia]
    C -->|Arredondamento para Cima| D[Capacidade Webchat Arredondada]
    D -->|Dedução de Volume Real| E[Chats Restantes (Surplus)]
    E -->|Média de 3 Síncronos| F[Agentes Liberados para Whats = floor_Surplus / 3]
    F -->|Transbordo de Fila| G(Fila Secundária: WhatsApp)
    G -->|Multiplicação 4/3| H[Capacidade WhatsApp Bruta = Agentes_Whats * Fator_Whats]
    H -->|Arredondamento para Cima| I[Capacidade WhatsApp Arredondada]
    I -->|Dedução de Volume Real Whats| J[Déficit / Sobra de Chats Whats]
    J -->|Se Negativo| K[Agentes Faltantes = ceil_Deficit / -4]
```

> [!IMPORTANT]
> A fila de **Webchat** é a fila primária. O **WhatsApp** funciona estritamente como fila secundária que recebe analistas liberados pela folga no Webchat. Se houver déficit no WhatsApp, calculamos a necessidade de novos contratados com base em 4 chamados simultâneos por agente exclusivo.

---

## 🗂️ 4. Localização dos Arquivos Chaves do Projeto

Para facilitar a manutenção do código, os arquivos principais do ecossistema estão localizados em:

1. **Contexto de Estado do React:**
   - [DimensionamentoContext.tsx](file:///c:/Users/User%20Yooga/Documents/PROJETOS/Dimensionamento_novo/src/context/DimensionamentoContext.tsx): Contém todos os estados da planilha, regras de normalização de strings (`normalizeName`), casamento de nomes (`matchAgentName`), salvamento local de dados e o motor matemático de cálculo central de dimensionamento.
2. **Componente de Visualização e Gestão de Capacity:**
   - [AgentCapacity.tsx](file:///c:/Users/User%20Yooga/Documents/PROJETOS/Dimensionamento_novo/src/components/AgentCapacity.tsx): Contém a tabela de capacidades do trimestre, o seletor de abas dinâmicas diárias, os inputs de Yooga Suporte / Care IA e o grid de cards premium de estatísticas/cápsulas.
3. **Componente de Controle de Escalas de Analistas:**
   - [EscalaTeamManager.tsx](file:///c:/Users/User%20Yooga/Documents/PROJETOS/Dimensionamento_novo/src/components/EscalaTeamManager.tsx): Contém as regras de visualização e controle da grade de escala de horários e folgas.

---

## 🚀 5. Próximos Passos e Recomendações

Se você é o novo agente de IA ou desenvolvedor responsável por continuar o projeto, aqui estão as recomendações técnicas prioritárias:

1. **Validação Contínua com TypeScript:**
   - Sempre que fizer alterações na estrutura do contexto ou na passagem de propriedades, execute `npx tsc --noEmit` para garantir integridade estática total do projeto.
2. **Preservação de Estilos do Tema:**
   - Evite adicionar classes Tailwind ou estilos hardcoded que introduzam cores violetas/roxas. Siga estritamente as variáveis base de cores (como `bg-card`, `border-border`, `text-muted-foreground`) para que o aplicativo continue se adaptando com perfeição aos modos escuro e claro originais da Yooga.
3. **Evitar Cálculos Inline no JSX:**
   - Ao estender a visualização de novas métricas ou linhas, utilize o helper de derivação de linhas (`deriveRow` ou mapeamento em `rows`) no início do componente. Não execute operações matemáticas complexas ou arredondamentos manuais diretamente no bloco de renderização do React para preservar a legibilidade e desempenho do sistema.
4. **Verificação de Regras Trabalhistas:**
   - A escala de analistas segue uma regra trabalhista estrita de 5x2 (Seção 5 da documentação principal). Certifique-se de que novos recursos de escala ou algoritmos de otimização respeitem essas restrições ao modificar o arquivo `EscalaTeamManager.tsx`.
