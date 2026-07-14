import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/lab-log.js";

function responseMock() {
  return {
    code: 200,
    headers: {},
    body: "",
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; },
    send(body) { this.body = body; return this; },
    end() { return this; },
  };
}

test("rejects cache-busting query parameters", async () => {
  const response = responseMock();
  await handler({ method: "GET", query: { theme: "dark", junk: "1" }, headers: {} }, response);
  assert.equal(response.code, 400);
});

test("renders the dated snapshot when GitHub is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  globalThis.fetch = async () => { throw new Error("offline"); };
  console.error = () => {};

  try {
    const response = responseMock();
    await handler({ method: "GET", query: { theme: "dark" }, headers: {} }, response);
    assert.equal(response.code, 200);
    assert.equal(response.headers["X-Data-Source"], "fallback-snapshot");
    assert.match(response.body, /CACHED SNAPSHOT · AS OF 2026-07-14/);
    assert.doesNotMatch(response.body, /LIVE GITHUB DATA/);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});
