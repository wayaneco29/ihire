// Local regression check: never reads .env.local or connects to a hosted project.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const cli = process.platform === "win32" ? "supabase.exe" : "supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
const base = new URL(status.API_URL);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Only local Supabase is allowed.");
const headers = { "Content-Type": "application/json", apikey: status.SERVICE_ROLE_KEY, Authorization: `Bearer ${status.SERVICE_ROLE_KEY}` };
const cases = [
  { name: "verified applicant", metadata: { role: "APPLICANT", phone_number: "+639123456789", phone_verified: true }, role: "APPLICANT" },
  { name: "invited staff", metadata: { role: "SDS" }, role: "SDS" },
  { name: "missing trusted role", metadata: {}, role: null },
  { name: "unverified applicant", metadata: { role: "APPLICANT", phone_number: "+639123456789" }, role: null },
];

for (const test of cases) {
  let userId;
  try {
    const response = await fetch(new URL("/auth/v1/admin/users", base), {
      method: "POST", headers,
      body: JSON.stringify({ email: `signup-regression-${randomUUID()}@example.com`, password: randomUUID(), email_confirm: true, app_metadata: test.metadata }),
    });
    const body = await response.json();
    userId = body.id;
    assert.equal(response.ok, Boolean(test.role), `${test.name}: unexpected Auth status ${response.status}`);
    if (test.role) {
      assert.match(userId, /^[0-9a-f-]{36}$/i);
      const result = execFileSync("docker", ["exec", "supabase_db_final", "psql", "-U", "postgres", "-d", "postgres", "-Atc",
        `select role::text || ':' || (phone_verified_at is not null)::text || ':' || (select count(*) from public.applicants where profile_id = profiles.id)::text from public.profiles where id = '${userId}'::uuid`], { encoding: "utf8" }).trim();
      assert.equal(result, test.role === "APPLICANT" ? "APPLICANT:true:1" : "SDS:false:0");
    }
    console.log(`PASS: ${test.name}`);
  } finally {
    if (userId) {
      const cleanup = await fetch(new URL(`/auth/v1/admin/users/${userId}`, base), { method: "DELETE", headers });
      assert.ok(cleanup.ok, "Temporary account cleanup failed.");
    }
  }
}
