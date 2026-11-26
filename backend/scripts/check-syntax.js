const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
function visit(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) visit(file);
    else if (file.endsWith(".js")) {
      const result = spawnSync(process.execPath, ["--check", file], {
        stdio: "inherit",
      });
      if (result.status !== 0) process.exit(1);
    }
  }
}
for (const dir of ["src", "database", "scripts", "test"])
  visit(path.join(__dirname, "..", dir));
console.log("JavaScript syntax checks passed.");
