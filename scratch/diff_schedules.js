import fs from "fs";
import path from "path";

const parseFile = (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.trim().split(/\r?\n/);
  const headers = lines[0].trim().split(/\s+/);
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length < headers.length) continue;
    const time = parts[0];
    const vals = {};
    for (let j = 1; j < headers.length; j++) {
      vals[headers[j]] = parseInt(parts[j], 10);
    }
    data.push({ time, vals });
  }
  return { headers: headers.slice(1), data };
};

const rootDir = "c:\\Users\\User Yooga\\Documents\\PROJETOS\\Dimensionamento_novo";
const antigo = parseFile(path.join(rootDir, "antigo.txt"));
const atual = parseFile(path.join(rootDir, "atual.txt"));

const days = antigo.headers;

// Definition of proposed agents using long day names
const proposedAgents = [
  {
    name: "Agente_1",
    start: "15:00",
    end: "00:00",
    days: ["Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
  },
  {
    name: "Agente_2",
    start: "14:00",
    end: "23:00",
    days: ["Segunda", "Quarta", "Quinta", "Sexta", "Sábado"],
  },
  {
    name: "Agente_3",
    start: "12:00",
    end: "21:00",
    days: ["Domingo", "Segunda", "Quarta", "Quinta", "Sexta"],
  },
  {
    name: "Agente_4",
    start: "07:00",
    end: "16:00",
    days: ["Domingo", "Terça", "Quarta", "Quinta", "Sexta"],
  },
];

const dayMap = {
  SEG: "Segunda",
  TER: "Terça",
  QUA: "Quarta",
  QUI: "Quinta",
  SEX: "Sexta",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

const isTimeInShift = (timeStr, startStr, endStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);

  const val = h * 60 + m;
  const startVal = startH * 60 + startM;
  let endVal = endH * 60 + endM;

  // Handle midnight crossing or shifts ending at 00:00
  if (endVal === 0) {
    endVal = 24 * 60;
  }

  if (endVal < startVal) {
    endVal += 24 * 60;
    const nextDayVal = val + 24 * 60;
    return (val >= startVal && val < 24 * 60) || (nextDayVal >= startVal && nextDayVal < endVal);
  }

  return val >= startVal && val < endVal;
};

// Check deltas
let mismatches = 0;
const limit = Math.min(antigo.data.length, atual.data.length);

console.log("=== VERIFICAÇÃO DA HIPÓTESE CORRIGIDA ===");

for (const day of days) {
  let dayMismatches = [];
  const longDay = dayMap[day];

  for (let i = 0; i < limit; i++) {
    const time = antigo.data[i].time;
    const valAntigo = antigo.data[i].vals[day];

    const matchingAtual = atual.data.find((d) => d.time === time);
    if (!matchingAtual) continue;
    const valAtual = matchingAtual.vals[day];
    const actualDelta = valAtual - valAntigo;

    // Calculate simulated delta
    let simulatedDelta = 0;
    proposedAgents.forEach((agent) => {
      if (agent.days.includes(longDay) && isTimeInShift(time, agent.start, agent.end)) {
        simulatedDelta++;
      }
    });

    if (actualDelta !== simulatedDelta) {
      dayMismatches.push({ time, actual: actualDelta, simulated: simulatedDelta });
      mismatches++;
    }
  }

  if (dayMismatches.length > 0) {
    console.log(`\n${day} (${longDay}): ${dayMismatches.length} divergências encontradas!`);
    console.log("Amostra das 5 primeiras:");
    dayMismatches.slice(0, 5).forEach((m) => {
      console.log(`  - Hora ${m.time}: Delta real = ${m.actual}, Delta simulado = ${m.simulated}`);
    });
  } else {
    console.log(`${day} (${longDay}): 100% de correspondência!`);
  }
}

console.log(`\nTotal de divergências no arquivo: ${mismatches}`);
