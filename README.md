# 📊 Dimensionamento Care - Yooga

> **Sistema de Planejamento Operacional, Escalas e Forecast de Suporte**

---

## 📋 O que é o projeto?

O **Dimensionamento Care** é uma aplicação web desenvolvida para a **Yooga** para gerenciar o planejamento operacional e otimizar a escala de atendentes do time de suporte ao cliente (Care).

O sistema substitui processos manuais (planilhas de Excel complexas e controles isolados) por uma interface interativa e integrada, projetada para balancear a qualidade do atendimento (SLA), a eficiência de custos com novas contratações e a carga horária de trabalho do time de suporte, operando em regime estendido de 20 horas diárias (das 07:00 às 03:00).

---

## 🧠 Metodologia de Dimensionamento

O suporte é modelado em faixas de **10 minutos** com alocação dinâmica e transbordamento (overflow):

1. **Fila Prioritária (Webchat)**: Toda a força de trabalho ativa é alocada primeiramente para cobrir a demanda de Webchat.
2. **Excedente (Overflow)**: Agentes ociosos no Webchat (sobra de capacidade) são automaticamente liberados para atender na fila de WhatsApp.
3. **Cálculo de Déficit**: Caso a capacidade do WhatsApp seja ultrapassada, o sistema aponta o déficit horários e calcula quantos agentes adicionais (contratações) seriam necessários para zerar o gargalo operacional.

---

## 🚀 Principais Recursos

- **Painel Operacional (Dashboard)**: Visualização em tempo real de KPIs de atendimento, volumes de chamados e capacidade total.
- **Planejador de Escala (Team Manager)**: Grade horária dinâmica e interativa para gerenciar turnos, pausas, almoço e folgas de cada agente.
- **Simulador de Contratações (Prova Real)**: Adiciona e simula a entrada de novos agentes no time e calcula instantaneamente a redução de gargalos na escala.
- **Configuração de TMA Dinâmico**: Permite parametrizar fatores de Tempo Médio de Atendimento específicos para cada dia da semana.
- **Sincronização Automatizada**: botão "Sincronizar com Freshchat" no painel `/capacidade` importa agentes e volume trimestral (90 dias) direto do Freshchat para o Supabase.

---

## 🛠️ Arquitetura e Tecnologias

O projeto é construído em cima de uma stack moderna e performática:

- **Frontend**: React + TypeScript + Tailwind CSS (Componentes customizados com Radix UI / Shadcn).
- **Roteamento e SSR**: TanStack Start (construído sobre Vinxi e Vite).
- **Banco de Dados & Realtime**: Supabase (PostgreSQL para persistência das escalas, parâmetros operacionais e meses).
- **Integração de Dados**: server function nativa em `src/lib/api/freshchat.server.ts` consome a Freshchat API diretamente e persiste no Supabase.
