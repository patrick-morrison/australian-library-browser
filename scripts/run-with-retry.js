#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");

const [, , scriptPath, attemptArg] = process.argv;

if (!scriptPath) {
  console.error("Usage: node scripts/run-with-retry.js <script> [attempts]");
  process.exit(1);
}

const attempts = Math.max(1, Number.parseInt(attemptArg || "2", 10) || 2);
const resolvedScript = path.resolve(process.cwd(), scriptPath);

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  console.log(`[retry] attempt ${attempt}/${attempts}: ${resolvedScript}`);
  const result = spawnSync(process.execPath, [resolvedScript], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env
  });

  if ((result.status || 0) === 0) {
    process.exit(0);
  }

  if (attempt === attempts) {
    process.exit(result.status || 1);
  }
}
