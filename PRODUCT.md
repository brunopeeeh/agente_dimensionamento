# Product

## Register

product

## Users

Ferramenta interna do time de **Care (suporte)** da Yooga. Dois perfis operam o sistema no dia a dia:

- **Analistas de WFM / dimensionamento** — especialistas que parametrizam TMA por dia da semana, rodam simulações de contratação ("Prova Real"), mantêm o forecast e ajustam a grade de escala faixa a faixa (blocos de 10 min).
- **Gestores / coordenadores do Care** — usam o sistema para decidir contratações, acompanhar SLA, capacidade e gargalos, e aprovar escalas.

Contexto de uso: sessões longas e analíticas, geralmente em desktop, sob pressão para equilibrar qualidade de atendimento (SLA), custo de novas contratações e carga horária do time — que opera em regime estendido de 20h/dia (07:00–03:00). O sistema substitui planilhas de Excel complexas e controles isolados.

## Product Purpose

O **Dimensionamento Care** planeja e otimiza a operação de suporte da Yooga: modela a demanda em faixas de 10 minutos com alocação dinâmica e transbordamento (Webchat prioritário → overflow para WhatsApp → cálculo de déficit e contratações necessárias). Reúne painel operacional de KPIs, planejador de escala interativo, simulador de contratações e forecast num só lugar.

Sucesso = o time toma decisões de escala e contratação com rapidez e confiança, enxergando gargalos e o impacto de cada ajuste instantaneamente — sem voltar para a planilha.

## Brand Personality

**Cockpit operacional denso.** Utilitário, orientado a dados, com muita informação legível por tela — prioriza velocidade de decisão e densidade sobre respiro decorativo. Tom prático e operacionalmente confiante, herdado da voz Yooga ("gestão suave"): direto, sem jargão corporativo. Três palavras: **denso, confiável, ágil.**

A densidade não é sinônimo de frieza: a ferramenta deve transmitir controle sob pressão, não sobrecarga. A cor de marca (azul Yooga `#19A1E6`) e uma tipografia clara mantêm calor e clareza mesmo com tabelas ricas e KPIs compactos. A DESIGN.md atual descreve o **site de marketing** da Yooga (outro registro, mais arejado); este produto aplica a identidade da marca a uma densidade de dashboard funcional — não deve ser copiado tal e qual.

## Anti-references

- **Planilha de Excel** — o sistema existe para substituir planilhas; não deve reproduzir a grade crua, caótica e sem hierarquia que veio resolver.
- **Dashboard SaaS genérico** — nada do template big-number + gradiente + cards idênticos repetidos ao infinito.
- **Enterprise frio / corporativo** — sem cinza pesado, morto e sem alma de software legado. Densidade sim, frieza não.
- **Marketing / landing page** — não é superfície de venda: sem heróis grandes, CTAs comerciais ("Quero assinar") ou copy persuasiva. Ação é operacional, não conversão.

## Design Principles

- **Densidade com hierarquia.** Muita informação por tela é uma feature, não um defeito — mas cada bloco precisa de hierarquia clara (peso, alinhamento, agrupamento) para que o olho ache o gargalo em segundos. Densidade sem hierarquia é a planilha que estamos substituindo.
- **O dado guia a decisão.** Todo número deve levar a uma ação: déficit → contratar, folga → realocar. Evidenciar o que precisa de atenção; não decorar o que não precisa.
- **Feedback instantâneo.** Simulações e ajustes de escala mostram impacto na hora (capacidade, gargalo, custo). A confiança do usuário vem de ver a consequência imediatamente.
- **Calor sob controle.** A identidade Yooga entra pela cor de marca, clareza tipográfica e microcópia direta — o suficiente para não parecer software corporativo frio, sem roubar espaço do dado.
- **Cor com significado.** Em uma tela densa, cor é sinal, não decoração: verde/vermelho de capacidade e déficit carregam informação e nunca dependem só do matiz (ver acessibilidade).

## Accessibility & Inclusion

- **WCAG 2.2 AA** como baseline: contraste de corpo ≥ 4.5:1, alvos de toque adequados, foco visível e navegação por teclado completa (crítico numa ferramenta de uso intenso e repetitivo).
- Bom senso de daltonismo nos estados de dados: déficit/capacidade e comparações não devem depender apenas de vermelho/verde — reforçar com ícone, rótulo, número ou padrão, principalmente em gráficos (Recharts) e na grade de escala.
- Português-BR apenas; sem requisitos multilíngues.
