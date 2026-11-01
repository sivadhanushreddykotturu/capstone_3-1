import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

function run(name, cwd, args, env) {
  const child = spawn(process.execPath, args, {
    cwd: path.join(root, cwd),
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    console.log(`[${name}] exited with code ${code}`);
    shutdown(code ?? 1);
  });
  return child;
}

const children = [
  run("api", "server", ["--env-file-if-exists=.env", "index.js"], { PORT: "4000" }),
  run("web", "web", ["node_modules/next/dist/bin/next", "start"], {}),
];

let closing = false;
function shutdown(code) {
  if (closing) return;
  closing = true;
  children.forEach((c) => c.kill());
  process.exit(code);
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));
