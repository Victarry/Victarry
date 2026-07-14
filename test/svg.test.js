import test from "node:test";
import assert from "node:assert/strict";
import { escapeXml, renderLabLog, truncate } from "../lib/svg.js";

test("escapes untrusted GitHub text before inserting it into SVG", () => {
  assert.equal(escapeXml('<script a="b">&</script>'), "&lt;script a=&quot;b&quot;&gt;&amp;&lt;/script&gt;");
});

test("renders theme, live label, and supplied activity", () => {
  const svg = renderLabLog({
    theme: "dark",
    updatedAt: new Date("2026-07-14T00:00:00Z"),
    activity: [{
      date: "2026-07-13T08:25:24Z",
      type: "REVIEW",
      repo: "Megatron-LM",
      description: "Review <unsafe>",
    }],
  });

  assert.match(svg, /LIVE GITHUB DATA/);
  assert.match(svg, /#d8b45b/);
  assert.match(svg, /Review &lt;unsafe&gt;/);
  assert.doesNotMatch(svg, /<unsafe>/);
});

test("can truthfully label a dated fallback snapshot", () => {
  const svg = renderLabLog({ metaLabel: "CACHED SNAPSHOT · AS OF 2026-07-14" });
  assert.match(svg, /CACHED SNAPSHOT · AS OF 2026-07-14/);
  assert.doesNotMatch(svg, /LIVE GITHUB DATA/);
});

test("truncates long descriptions without breaking the layout", () => {
  assert.equal(truncate("abcdefgh", 6), "abcde…");
});
