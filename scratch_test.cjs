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
        {role: 'system', content: 'Output ONLY JSON. { "agents": [] }'}, 
        {role: 'user', content: 'Do it'}
      ], 
      response_format: { type: 'json_object' } 
    }) 
  });
  console.log(await req.text());
}
test();
