import { spawn } from "node:child_process";
import { once } from "node:events";

const baseUrl = "http://127.0.0.1:4173";

await run("npm", ["run", "build"]);

const server = spawn("./node_modules/.bin/vite", ["preview", "--host", "127.0.0.1", "--port", "4173"], {
  detached: process.platform !== "win32",
  stdio: "inherit",
  env: process.env,
});

try {
  await waitForServer(baseUrl, 30_000);
  await run("npx", ["playwright", "test", "--config", "playwright.config.ts"]);
} finally {
  await stopServer(server);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
    child.on("error", reject);
  });
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await sleep(250);
    }
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stopServer(serverProcess) {
  if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) return;

  if (process.platform === "win32") {
    serverProcess.kill("SIGTERM");
  } else {
    process.kill(-serverProcess.pid, "SIGTERM");
  }

  await Promise.race([
    once(serverProcess, "exit"),
    sleep(5_000).then(() => {
      if (serverProcess.exitCode === null && serverProcess.signalCode === null) {
        if (process.platform === "win32") serverProcess.kill("SIGKILL");
        else process.kill(-serverProcess.pid, "SIGKILL");
      }
    }),
  ]);
}
