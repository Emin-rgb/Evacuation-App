// PostToolUse hook: format the file Claude just edited with Prettier.
// Runs outside the model, so it costs zero tokens. Never blocks Claude.
import { execFileSync } from "node:child_process";

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const file = JSON.parse(raw)?.tool_input?.file_path;
    if (file && /\.(tsx?|jsx?|css|json|md)$/.test(file) && !file.includes("node_modules")) {
      execFileSync("npx", ["prettier", "--write", "--log-level", "silent", file], { stdio: "ignore" });
    }
  } catch {
    // ignore — formatting must never break the session
  }
  process.exit(0);
});
