const fs = require('fs');

async function test() {
  const req = await fetch('https://api.deepseek.com/v1/chat/completions', { 
    method: 'POST', 
    headers: { 
      'Authorization': 'Bearer sk-4be2a30953f244068f681ea36a20465a', 
      'Content-Type': 'application/json' 
    }, 
    body: JSON.stringify({ 
      model: 'deepseek-v4-pro', 
      messages: [
        { role: 'system', content: `Você é um analista operacional responsável por definir a quantidade, os horários e os dias de trabalho dos agentes que devem ser contratados a cada mês para um time de suporte ao cliente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS ABSOLUTAS — NUNCA VIOLAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R1. OS ÚNICOS TURNOS VÁLIDOS SÃO OS 9 ABAIXO. NENHUM OUTRO TURNO PODE SER SUGERIDO:
   07:00 às 16:00  (inicio: '07:00', fim: '16:00')
   08:00 às 17:00  (inicio: '08:00', fim: '17:00')
   09:00 às 18:00  (inicio: '09:00', fim: '18:00')
   10:00 às 19:00  (inicio: '10:00', fim: '19:00')
   11:00 às 20:00  (inicio: '11:00', fim: '20:00')
   12:00 às 21:00  (inicio: '12:00', fim: '21:00')
   13:00 às 22:00  (inicio: '13:00', fim: '22:00')
   14:00 às 23:00  (inicio: '14:00', fim: '23:00')
   15:00 às 00:00  (inicio: '15:00', fim: '00:00')

R2. AS ÚNICAS COMBINAÇÕES DE FOLGA PERMITIDAS SÃO AS 4 ABAIXO:
   Opção A — folga: ['sab', 'seg']  |  trabalha: ['ter', 'qua', 'qui', 'sex', 'dom']
   Opção B — folga: ['sab', 'ter']  |  trabalha: ['seg', 'qua', 'qui', 'sex', 'dom']
   Opção C — folga: ['dom', 'seg']  |  trabalha: ['ter', 'qua', 'qui', 'sex', 'sab']
   Opção D — folga: ['dom', 'ter']  |  trabalha: ['seg', 'qua', 'qui', 'sex', 'sab']

R3. NUNCA coloque 'sab' e 'dom' JUNTOS em dias_trabalho do mesmo agente.

R4. Cada agente tem EXATAMENTE 5 dias de trabalho e 2 dias de folga (jornada 5x2).

R5. Limite de contratação: MÁXIMO 4 agentes por mês.

FORMATO DE SAÍDA OBRIGATÓRIO (JSON)
Responda APENAS com um objeto JSON. Não use markdown, não adicione comentários.` }, 
        { role: 'user', content: `Mês de planejamento: Junho
start_time	end_time	seg	ter	qua	qui	sex	sab	dom
10:00	10:10	1	1	1	1	1	1	1
10:10	10:20	2	2	1	1	1	1	0` }
      ], 
      response_format: { type: 'json_object' },
      temperature: 0.2
    }) 
  });
  console.log(await req.text());
}
test();
