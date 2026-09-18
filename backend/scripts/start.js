// backend/scripts/start.js
// Runs migrations and seeds before starting the server
const { spawn } = require("child_process");

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ Running: ${command} ${args.join(" ")}`);
    const proc = spawn(command, args, { stdio: "inherit", shell: true });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });
  });
}

async function start() {
  try {
    console.log("🚀 Initializing SmartFinance Backend & Database...");
    await runCommand("node", ["db/migrate.js"]);
    await runCommand("node", ["db/seed.js"]);
    console.log("✅ Database initialized successfully. Starting server...\n");
    require("../server.js");
  } catch (error) {
    console.error("❌ Initialization failed:", error.message);
    // Still start server so developer can inspect or retry
    require("../server.js");
  }
}

start();
