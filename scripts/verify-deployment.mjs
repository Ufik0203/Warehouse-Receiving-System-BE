import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { setTimeout } from "node:timers";

const file = resolve(process.argv[2] ?? "deploy/.env.verification");
const env = Object.fromEntries(
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);
assert.match(env.COMPOSE_PROJECT_NAME ?? "", /^wrs-task7-[a-z0-9]+$/);
assert.ok(env.POSTGRES_DB?.endsWith("_test"));
const args = [
  "compose",
  "-f",
  resolve("deploy/compose.yaml"),
  "--env-file",
  file,
  "--project-name",
  env.COMPOSE_PROJECT_NAME,
];
const base = env.APP_ORIGIN;
const report = {
  date: "2026-10-29",
  project: env.COMPOSE_PROJECT_NAME,
  database: env.POSTGRES_DB,
  status: "RUNNING",
  checks: {},
};
const evidence = resolve("docs/evidence/task7-operational.json");
function record(name, value = "PASS") {
  report.checks[name] = value;
  writeFileSync(evidence, JSON.stringify(report, null, 2) + "\n");
  console.log(`${name}: ${value}`);
}
function docker(...extra) {
  try {
    return execFileSync("docker", [...args, ...extra], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 120000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(
      "Docker operation failed; inspect isolated deployment without printing credentials.",
    );
  }
}
async function request(path, options = {}) {
  return globalThis.fetch(base + path, {
    ...options,
    signal: globalThis.AbortSignal.timeout(9000),
  });
}
async function waitStatus(path, status) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      if ((await request(path)).status === status) return;
    } catch {
      /* Service transition. */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Expected service status ${status} on ${path}.`);
}
const secrets = [
  env.POSTGRES_PASSWORD,
  env.REDIS_PASSWORD,
  env.SESSION_SECRET,
  env.SEED_SUPERVISOR_PASSWORD,
  env.SEED_OPERATOR_PASSWORD,
].filter(Boolean);
let sid = "",
  token = "";
function absorbCookie(response) {
  const cookies = response.headers.getSetCookie();
  const cookie = cookies.find((value) => value.startsWith("wrs.sid="));
  if (cookie) {
    sid = cookie.split(";")[0];
    secrets.push(sid, decodeURIComponent(sid));
    const value = decodeURIComponent(sid.split("=").slice(1).join("="));
    secrets.push(value.slice(2).split(".")[0]);
  }
  return cookies;
}
async function login() {
  const bootstrap = await request("/api/v1/auth/csrf-token");
  assert.equal(bootstrap.status, 200);
  absorbCookie(bootstrap);
  token = (await bootstrap.json()).data.csrfToken;
  secrets.push(token);
  const result = await request("/api/v1/auth/login", {
    method: "POST",
    headers: {
      Cookie: sid,
      Origin: base,
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify({
      email: env.SEED_SUPERVISOR_EMAIL,
      password: env.SEED_SUPERVISOR_PASSWORD,
    }),
  });
  assert.equal(result.status, 200);
  const cookies = absorbCookie(result);
  token = (await result.json()).data.csrfToken;
  secrets.push(token);
  assert.match(cookies.join(";"), /HttpOnly/);
  assert.match(cookies.join(";"), /SameSite=Lax/);
  assert.match(cookies.join(";"), /Path=\//);
  assert.doesNotMatch(cookies.join(";"), /;\s*(Secure|Domain)=?/i);
}
async function me() {
  return request("/api/v1/auth/me", { headers: { Cookie: sid } });
}
const snapshotCode = `import {createHash} from 'node:crypto';import{createPrisma}from'./dist/src/lib/prisma.js';const p=createPrisma(process.env.DATABASE_URL);try{const users=await p.user.findMany({orderBy:{id:'asc'}});const migrations=await p.$queryRaw\`SELECT migration_name,checksum FROM _prisma_migrations ORDER BY migration_name\`;console.log(JSON.stringify({fingerprint:createHash('sha256').update(JSON.stringify({users,migrations})).digest('hex'),users:users.length,products:await p.product.count()}));}finally{await p.$disconnect();}`;
function snapshot() {
  return JSON.parse(
    docker(
      "exec",
      "-T",
      "api",
      "node",
      "--input-type=module",
      "-e",
      snapshotCode,
    ),
  );
}

try {
  await waitStatus("/health/ready", 200);
  assert.equal((await request("/health/live")).status, 200);
  record("gatewayHealthReadiness");
  const html = await (await request("/receivings/deep-link")).text();
  assert.match(html, /<!doctype html>/i);
  const asset = html.match(/src="([^"]+\.js)"/)?.[1];
  assert.ok(asset);
  assert.equal((await request(asset)).status, 200);
  record("staticAssetAndNestedRoute");
  await login();
  assert.equal((await me()).status, 200);
  record("sessionCsrfLocalCookie");
  const product = await request("/api/v1/products", {
    method: "POST",
    headers: {
      Cookie: sid,
      Origin: base,
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify({
      sku: `OPS-${randomUUID().slice(0, 12)}`.toUpperCase(),
      name: "Persistent deployment marker",
    }),
  });
  assert.equal(product.status, 201);
  const productId = (await product.json()).data.id;
  const before = snapshot();
  docker("run", "--rm", "migrate");
  const after = snapshot();
  assert.deepEqual(after, before);
  record("migrationAndSeedRerunPreservesAccountsHashesHistory");
  docker("restart", "api");
  await waitStatus("/health/ready", 200);
  assert.equal((await me()).status, 200);
  record("sessionSurvivesApiRestart");
  docker("stop", "redis");
  await waitStatus("/health/ready", 503);
  assert.equal((await request("/health/live")).status, 200);
  assert.equal((await me()).status, 503);
  record("redisOutageFailsClosed");
  docker("start", "redis");
  await waitStatus("/health/ready", 200);
  assert.equal((await me()).status, 200);
  record("redisAutomaticRecoveryAndSessionPersistence");
  docker("stop", "postgres");
  await waitStatus("/health/ready", 503);
  assert.equal((await request("/health/live")).status, 200);
  assert.equal((await me()).status, 503);
  record("postgresOutageReadinessFails");
  docker("start", "postgres");
  await waitStatus("/health/ready", 200);
  assert.equal((await me()).status, 200);
  assert.equal(
    (
      await request(`/api/v1/products/${productId}`, {
        headers: { Cookie: sid },
      })
    ).status,
    200,
  );
  record("postgresRecoveryAndDataPersistence");
  const container = docker("ps", "-q", "api").trim();
  const prior = docker("logs", "--no-color", "api");
  docker("stop", "api");
  const state = JSON.parse(
    execFileSync(
      "docker",
      ["inspect", "--format", "{{json .State}}", container],
      { encoding: "utf8", windowsHide: true },
    ),
  );
  assert.equal(state.Status, "exited");
  assert.equal(state.ExitCode, 0);
  const logs = docker("logs", "--no-color", "api");
  assert.ok(
    logs.split("Shutdown completed.").length >
      prior.split("Shutdown completed.").length,
  );
  assert.notEqual((await request("/health/live")).status, 200);
  record("sigtermGracefulShutdownExitZeroListenerClosed");
  docker("start", "api");
  await waitStatus("/health/ready", 200);
  assert.equal((await me()).status, 200);
  docker("restart", "web");
  await waitStatus("/health/ready", 200);
  assert.equal((await me()).status, 200);
  record("gatewayRestartPreservesSessionAndApp");
  const images = ["api", "migrate", "web"].map(
    (service) => `${env.COMPOSE_PROJECT_NAME}-${service}:local`,
  );
  let inspectText = docker(
    "logs",
    "--no-color",
    "api",
    "web",
    "migrate",
    "postgres",
    "redis",
  );
  for (const image of images)
    inspectText += execFileSync(
      "docker",
      ["history", "--no-trunc", "--format", "{{.CreatedBy}}", image],
      { encoding: "utf8", windowsHide: true },
    );
  inspectText += docker(
    "exec",
    "-T",
    "web",
    "sh",
    "-c",
    "cat /usr/share/nginx/html/assets/*.js",
  );
  for (const secret of secrets)
    if (secret && secret.length > 8)
      assert.ok(
        !inspectText.includes(secret),
        "Sensitive value detected in logs/image history/bundle.",
      );
  record("noAuditedSecretsSessionIdsCsrfInLogsLayersOrFrontendBundle");
  const ps = docker("ps", "--format", "json")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.ok(
    ps.every(
      (service) =>
        !["postgres", "redis", "api"].includes(service.Service) ||
        !service.Publishers?.some((port) => port.PublishedPort > 0),
    ),
  );
  record("databaseRedisApiNotPublished");
  const versions = docker(
    "exec",
    "-T",
    "api",
    "sh",
    "-ec",
    "node --version; npm --version",
  );
  assert.match(versions, /v24\.12\.0/);
  assert.match(versions, /11\.6\.2/);
  record("pinnedNodeAndNpmInRuntime");
  report.status = "PASS";
  writeFileSync(evidence, JSON.stringify(report, null, 2) + "\n");
} catch (error) {
  report.status = "FAIL";
  report.error =
    error instanceof Error ? error.message : "Operational verification failed.";
  writeFileSync(evidence, JSON.stringify(report, null, 2) + "\n");
  console.error("Operational verification failed; see sanitized evidence.");
  process.exitCode = 1;
}
