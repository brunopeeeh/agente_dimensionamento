// TEMPORÁRIO — smoke test contra a API real do HubSpot. Apagar após rodar.
import { readFileSync } from "node:fs";
import process from "node:process";
import { describe, it } from "vitest";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.trimStart().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
process.env.HUBSPOT_ACCESS_TOKEN = env.HUBSPOT_ACCESS_TOKEN;

describe("hubspot live", () => {
  it("lists 90-day ticket volume per support agent", { timeout: 180_000 }, async () => {
    const { getWindow90Days } = await import("./freshchat.server");
    const { getHubspotVolumes90Days } = await import("./hubspot.server");

    const janela = getWindow90Days();
    console.log(
      `janela: ${janela.start.toISOString()} .. ${janela.end.toISOString()} ` +
        `(${janela.start.getTime()} .. ${janela.end.getTime() - 1})`,
    );

    const volumes = await getHubspotVolumes90Days(janela);
    console.table(volumes);
    console.log("TOTAL:", volumes.reduce((acc, v) => acc + v.total, 0));
  });
});
