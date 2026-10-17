import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

await run(["run", "build", "-w", "business-obligations"]);
await run(["run", "build", "-w", "business-obligations-ui"]);

const ui = spawn(npm, ["run", "dev", "-w", "business-obligations-ui"], { stdio: "inherit" });
const web = spawn(npm, ["run", "dev", "-w", "@business-obligations/web"], { stdio: "inherit" });

const stop = () => {
  ui.kill("SIGTERM");
  web.kill("SIGTERM");
};

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
ui.once("exit", stop);
web.once("exit", stop);
