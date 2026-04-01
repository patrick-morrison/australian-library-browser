#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");

function extractUrls(values) {
  const text = Array.isArray(values) ? values.join("\n") : String(values || "");
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) || [];
  return [...new Set(matches.map((value) => value.trim()))];
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => resolve(input));
  });
}

async function main() {
  const stdin = await readStdin();
  const urls = extractUrls([...process.argv.slice(2), stdin]);

  if (!urls.length) {
    console.error("Usage: node scripts/open-tabs-cli.js <url> [url ...]");
    console.error("   or: pbpaste | node scripts/open-tabs-cli.js");
    process.exit(1);
  }

  const electronBinary = require("electron");
  const child = spawn(electronBinary, [repoRoot, ...urls], {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: ""
    }
  });
  child.unref();

  process.stdout.write(`Opening ${urls.length} tab${urls.length === 1 ? "" : "s"} in Trove Library Browser.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
