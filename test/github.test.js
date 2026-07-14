import test from "node:test";
import assert from "node:assert/strict";
import { selectActivity } from "../lib/github.js";

const event = (id, type, date) => ({
  id,
  type,
  date,
  repo: "Megatron-LM",
  description: id,
  url: `https://github.com/${id}`,
});

test("selectActivity balances meaningful event types and sorts newest first", () => {
  const result = selectActivity({
    merged: [event("m1", "MERGED PR", "2026-06-01"), event("m2", "MERGED PR", "2026-05-01")],
    reviews: [event("r1", "REVIEW", "2026-07-01"), event("r2", "REVIEW", "2026-04-01")],
    releases: [event("v1", "RELEASE", "2026-03-01")],
    pushes: [event("c1", "COMMIT", "2026-08-01")],
  });

  assert.deepEqual(result.map((item) => item.id), ["r1", "m1", "m2", "r2", "v1"]);
  assert.equal(result.some((item) => item.type === "COMMIT"), false);
});

test("selectActivity uses a commit when there is no release", () => {
  const result = selectActivity({ pushes: [event("c1", "COMMIT", "2026-06-01")] });
  assert.equal(result[0].id, "c1");
});
