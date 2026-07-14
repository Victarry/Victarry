import { mkdir, writeFile } from "node:fs/promises";
import { fetchGithubActivity } from "../lib/github.js";
import { renderLabLog } from "../lib/svg.js";

const activity = await fetchGithubActivity({
  username: "Victarry",
  token: process.env.GITHUB_TOKEN,
});

await mkdir("assets", { recursive: true });
await Promise.all(
  ["light", "dark"].map((theme) =>
    writeFile(
      `assets/lab-log-${theme}.svg`,
      renderLabLog({ activity, theme, updatedAt: new Date() }),
    ),
  ),
);

console.log(`Rendered ${activity.length} live GitHub activities.`);
