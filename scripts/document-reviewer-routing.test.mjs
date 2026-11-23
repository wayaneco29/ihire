import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");

function loadModule(path, overrides = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const loadedModule = { exports: {} };
  runInNewContext(outputText, {
    module: loadedModule, exports: loadedModule.exports, URL,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key" } },
    require: (name) => overrides[name] ?? require(name),
  });
  return loadedModule.exports;
}

const routing = loadModule("../src/lib/auth/role-routing.ts", {
  "@/constants/roles": loadModule("../src/constants/roles.ts"),
});

function createProxy(user, error = null) {
  return loadModule("../src/proxy.ts", {
    "@/lib/auth/role-routing": routing,
    "@supabase/ssr": {
      createServerClient: (_url, _key, { cookies }) => ({
        auth: {
          getUser: async () => {
            cookies.setAll([{ name: "refreshed-session", value: "fresh", options: { httpOnly: true } }]);
            return { data: { user }, error };
          },
          // Simulate a stale reviewer JWT that disagrees with the current user.
          getClaims: async () => ({ data: { claims: { sub: "user-id", app_metadata: { role: "DOCUMENT_REVIEWER" } } } }),
        },
      }),
    },
  }).proxy;
}

test("reviewer can open queue, applicant, and document routes without redirects", async () => {
  const proxy = createProxy({ id: "user-id", app_metadata: { role: "DOCUMENT_REVIEWER" } });
  for (const path of ["/document-reviewer/documents", "/document-reviewer/applicants/A001", "/document-reviewer/documents/document-id"]) {
    const response = await proxy(new NextRequest(`https://app.example${path}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.cookies.get("refreshed-session")?.value, "fresh");
  }
});

test("stale reviewer claims do not bounce a changed role back to reviewer pages", async () => {
  const proxy = createProxy({ id: "user-id", app_metadata: { role: "EVALUATOR" } });
  const response = await proxy(new NextRequest("https://app.example/document-reviewer/documents"));
  assert.equal(response.headers.get("location"), "https://app.example/evaluator/reviews");
  assert.equal(response.cookies.get("refreshed-session")?.value, "fresh");
  const destination = await proxy(new NextRequest(response.headers.get("location")));
  assert.equal(destination.status, 200);
});

for (const [label, user, error] of [
  ["signed-out session", null, null],
  ["revoked session", { id: "user-id", app_metadata: { role: "DOCUMENT_REVIEWER" } }, { message: "Invalid session" }],
  ["missing role", { id: "user-id", app_metadata: {} }, null],
  ["unknown role", { id: "user-id", app_metadata: { role: "UNKNOWN" } }, null],
]) {
  test(`${label} reaches sign-in without redirecting back`, async () => {
    const proxy = createProxy(user, error);
    const response = await proxy(new NextRequest("https://app.example/document-reviewer/documents"));
    const location = new URL(response.headers.get("location"));
    assert.equal(location.pathname, "/");
    assert.equal(location.searchParams.get("next"), "/document-reviewer/documents");
    const signIn = await proxy(new NextRequest(location));
    assert.equal(signIn.status, 200);
    assert.equal(signIn.headers.get("location"), null);
  });
}
