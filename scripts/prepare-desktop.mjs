import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "..");
const repoDir = path.resolve(appDir, "..");
const coreDir = path.join(repoDir, "petflow-core");
const resourcesDir = path.join(appDir, "src-tauri", "resources");
const bundledCoreDir = path.join(resourcesDir, "petflow-core");

function npmCmd() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function npmInvocation(args) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    return { command: process.execPath, args: [npmExecPath, ...args] };
  }
  return { command: npmCmd(), args };
}

async function run(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function main() {
  await mkdir(resourcesDir, { recursive: true });
  await rm(bundledCoreDir, { recursive: true, force: true });

  const prismaCli = path.join(coreDir, "node_modules", "prisma", "build", "index.js");
  try {
    await access(prismaCli);
  } catch {
    throw new Error(
      `Prisma CLI introuvable: ${prismaCli}\n` +
        `Lance d'abord \`npm install\` dans \`petflow-core\`, puis relance \`npm run desktop:prepare\`.`,
    );
  }
  const env = {
    ...process.env,
    DATABASE_URL: "file:./prisma/dev.db",
    MASTER_DATABASE_URL: "file:./prisma/master.db",
  };

  await run("node", [prismaCli, "generate", "--schema", "prisma/schema.prisma"], { cwd: coreDir, env });
  await run("node", [prismaCli, "generate", "--schema", "prisma/master.prisma"], { cwd: coreDir, env });
  const npmBuild = npmInvocation(["run", "build"]);
  await run(npmBuild.command, npmBuild.args, { cwd: coreDir, env });

  await mkdir(bundledCoreDir, { recursive: true });
  await cp(path.join(coreDir, "dist"), path.join(bundledCoreDir, "dist"), { recursive: true });
  await cp(path.join(coreDir, "node_modules"), path.join(bundledCoreDir, "node_modules"), { recursive: true });
  await cp(path.join(coreDir, "prisma"), path.join(bundledCoreDir, "prisma"), { recursive: true });

  console.log(`OK: resources prêts dans ${bundledCoreDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
