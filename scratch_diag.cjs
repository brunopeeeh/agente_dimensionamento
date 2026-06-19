const fs = require("fs");

// Load environment variables
const env = fs.readFileSync(".env", "utf8");
env.split("\n").forEach((line) => {
  const idx = line.indexOf("=");
  if (idx !== -1) {
    const k = line.substring(0, idx).trim();
    let v = line.substring(idx + 1).trim();
    if (v.startsWith(String.fromCharCode(34)) && v.endsWith(String.fromCharCode(34))) {
      v = v.substring(1, v.length - 1);
    }
    process.env[k] = v;
  }
});

const FRESHCHAT_API = "https://api.freshchat.com/v2";
const RETENTION_GROUP_ID = "3ea40078-55f2-4176-85ee-face7f3d7498";
const WEBCHAT_GROUP_ID = "6b748002-634a-4ba7-b191-844d123643ed";
const ONBOARDING_GROUP_ID = "64f40e5f-b18a-4d1d-8c23-1fcb9575c5a7";

function isInTargetGroup(groups) {
  if (!groups || !Array.isArray(groups)) return false;
  return groups.includes(RETENTION_GROUP_ID) || groups.includes(WEBCHAT_GROUP_ID);
}

function isInOnboarding(groups) {
  if (!groups || !Array.isArray(groups)) return false;
  return groups.includes(ONBOARDING_GROUP_ID);
}

async function runDiagnostic() {
  const bearer = process.env.FRESHCHAT_BEARER_TOKEN;

  console.log("Fetching agents...");
  const agentsRes = await fetch(`${FRESHCHAT_API}/agents?page=1&items_per_page=100`, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      accept: "application/json",
    },
  });

  const agentsData = await agentsRes.json();
  const supportAgents = (agentsData.agents || []).filter(
    (a) => isInTargetGroup(a.groups) && !isInOnboarding(a.groups),
  );
  console.log("Total support agents:", supportAgents.length);

  const agentIds = supportAgents.map((a) => a.id);

  // Setup dates
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 90);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const volumes = {};
  let cursor = 0;
  const VOLUME_CONCURRENCY = 4;

  async function worker() {
    while (cursor < agentIds.length) {
      const id = agentIds[cursor++];
      const agent = supportAgents.find((a) => a.id === id);
      const fullName = `${agent.first_name || ""} ${agent.last_name || ""}`.trim();

      try {
        const url = new URL(`${FRESHCHAT_API}/metrics/historical`);
        url.searchParams.set("metric", "conversation_metrics.resolved_interactions");
        url.searchParams.set("start", startStr);
        url.searchParams.set("end", endStr);
        url.searchParams.set("count_metric", "count");
        url.searchParams.set("filter_by", `agent=${id}`);
        url.searchParams.set("group_by", "agent");
        url.searchParams.set("interval", "1d");

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${bearer}`,
            accept: "application/json",
          },
        });

        if (!res.ok) {
          console.warn(
            `[freshchat] WARNING: status ${res.status} ${res.statusText} for agent ${fullName}`,
          );
          volumes[id] = 0;
          continue;
        }

        const data = await res.json();
        let total = 0;
        for (const entry of data.data || []) {
          for (const serie of entry.series || []) {
            for (const v of serie.values || []) {
              total += parseFloat(v.value) || 0;
            }
          }
        }
        console.log(`Synced ${fullName}: total = ${total}`);
        volumes[id] = total;
      } catch (err) {
        console.error(`[freshchat] ERROR for agent ${fullName}:`, err);
        volumes[id] = 0;
      }
    }
  }

  const workers = Array.from({ length: Math.min(VOLUME_CONCURRENCY, agentIds.length) }, () =>
    worker(),
  );
  await Promise.all(workers);

  console.log("\n--- FINAL VOLUMES MAP ---");
  supportAgents.forEach((a) => {
    const fullName = `${a.first_name || ""} ${a.last_name || ""}`.trim();
    console.log(`${fullName}: ${volumes[a.id]}`);
  });
}

runDiagnostic();
