export const normalizeName = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

export const matchAgentName = (capName: string, teamName: string) => {
  const capNorm = normalizeName(capName);
  const teamNorm = normalizeName(teamName);

  if (capNorm === "andreia" && teamNorm.includes("andrea")) return true;
  if (capNorm === "marlonsa" && teamNorm.includes("marlon")) return true;
  if (capNorm === "malu" && (teamNorm.includes("malu") || teamNorm.includes("marialuiza")))
    return true;
  if (capNorm === "romerio" && teamNorm.includes("romerio")) return true;
  if (capNorm === "brenda" && teamNorm.includes("brenda")) return true;
  if (capNorm === "rafael" && teamNorm.includes("rafael")) return true;
  if (capNorm === "bryan" && teamNorm.includes("bryan")) return true;
  if (capNorm === "julio" && teamNorm.includes("julio")) return true;

  return teamNorm.includes(capNorm) || capNorm.includes(teamNorm);
};
