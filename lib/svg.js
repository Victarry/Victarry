const THEMES = {
  light: {
    primary: "#1f2328",
    muted: "#59636e",
    rule: "#d0d7de",
    accent: "#8a6d1d",
  },
  dark: {
    primary: "#e6edf3",
    muted: "#8b949e",
    rule: "#30363d",
    accent: "#d8b45b",
  },
};

export function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function truncate(value = "", max = 76) {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function dateOnly(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : date.toISOString().slice(0, 10);
}

function rows(activity, colors) {
  if (!activity.length) {
    return `
      <circle cx="40" cy="86" r="3" fill="${colors.accent}"/>
      <text x="64" y="90" class="date">—</text>
      <text x="160" y="90" class="tag">STATUS</text>
      <text x="280" y="90" class="repo">GitHub activity temporarily unavailable</text>
      <text x="280" y="107" class="note">The cached profile will retry automatically.</text>`;
  }

  return activity
    .map((item, index) => {
      const y = 86 + index * 48;
      return `
      <circle cx="40" cy="${y - 4}" r="3" fill="${colors.accent}"/>
      <text x="64" y="${y}" class="date">${escapeXml(dateOnly(item.date))}</text>
      <text x="160" y="${y}" class="tag">${escapeXml(item.type)}</text>
      <text x="280" y="${y}" class="repo">${escapeXml(truncate(item.repo, 28))}</text>
      <text x="280" y="${y + 17}" class="note">${escapeXml(truncate(item.description))}</text>`;
    })
    .join("");
}

export function renderLabLog({
  activity = [],
  theme = "light",
  updatedAt = new Date(),
  metaLabel,
} = {}) {
  const mode = theme === "dark" ? "dark" : "light";
  const colors = THEMES[mode];
  const count = Math.max(activity.length, 1);
  const bottomRule = 78 + count * 48;
  const height = bottomRule + 42;
  const timelineEnd = 62 + count * 48;
  const updated = dateOnly(updatedAt);
  const status = metaLabel || `LIVE GITHUB DATA · UPDATED ${updated}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="${height}" viewBox="0 0 880 ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Victarry&apos;s recent GitHub activity</title>
  <desc id="desc">Recent merged pull requests, reviews, releases, and commits sourced from GitHub.</desc>
  <style>
    .label { font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 2px; fill: ${colors.accent}; }
    .meta  { font: 400 10.5px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${colors.muted}; }
    .date  { font: 400 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${colors.muted}; }
    .tag   { font: 600 10.5px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .8px; fill: ${colors.accent}; }
    .repo  { font: 600 13.5px/1 -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Helvetica, Arial, sans-serif; fill: ${colors.primary}; }
    .note  { font: 400 12.5px/1 -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Helvetica, Arial, sans-serif; fill: ${colors.muted}; }
    .rule  { stroke: ${colors.rule}; stroke-width: 1; }
  </style>
  <text x="40" y="32" class="label">LAB LOG</text>
  <text x="840" y="32" text-anchor="end" class="meta">${escapeXml(status)}</text>
  <line x1="40" y1="48" x2="840" y2="48" class="rule"/>
  <line x1="40" y1="66" x2="40" y2="${timelineEnd}" class="rule"/>
  ${rows(activity, colors)}
  <line x1="40" y1="${bottomRule}" x2="840" y2="${bottomRule}" class="rule"/>
  <text x="40" y="${bottomRule + 20}" class="meta">Public activity from github.com/Victarry · cached at the Vercel edge</text>
</svg>`;
}
