import { createHash } from "node:crypto";
import { FALLBACK_ACTIVITY } from "../lib/fallback.js";
import { fetchGithubActivity } from "../lib/github.js";
import { renderLabLog } from "../lib/svg.js";

const CACHE = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    return response.status(405).send("Method Not Allowed");
  }

  const unknownQuery = Object.keys(request.query || {}).filter((key) => key !== "theme");
  if (unknownQuery.length) return response.status(400).send("Unsupported query parameter");

  const theme = request.query?.theme === "dark" ? "dark" : "light";
  let activity = [];
  let source = "github-live";
  let metaLabel;

  try {
    activity = await fetchGithubActivity({
      username: "Victarry",
      token: process.env.GITHUB_TOKEN,
    });
    if (!activity.length) source = "github-empty";
  } catch (error) {
    source = "fallback-snapshot";
    activity = FALLBACK_ACTIVITY;
    metaLabel = "CACHED SNAPSHOT · AS OF 2026-07-14";
    console.error("GitHub activity fetch failed", error);
  }

  const svg = renderLabLog({ activity, theme, updatedAt: new Date(), metaLabel });
  const etag = `W/\"${createHash("sha256").update(svg).digest("base64url").slice(0, 24)}\"`;

  response.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  response.setHeader("Cache-Control", CACHE);
  response.setHeader("CDN-Cache-Control", CACHE);
  response.setHeader("Vercel-CDN-Cache-Control", CACHE);
  response.setHeader("ETag", etag);
  response.setHeader("X-Data-Source", source);
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.headers["if-none-match"] === etag) {
    return response.status(304).end();
  }

  if (request.method === "HEAD") return response.status(200).end();
  return response.status(200).send(svg);
}
