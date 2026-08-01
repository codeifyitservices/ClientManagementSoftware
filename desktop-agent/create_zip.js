const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const distDir = path.join(__dirname, "dist");
const unpackedDir = path.join(distDir, "win-unpacked");
const zipPath = path.join(distDir, "Company_Desktop_Agent_Package.zip");

if (fs.existsSync(unpackedDir)) {
  try {
    // Delete existing zip if present
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    console.log("Compressing win-unpacked directory into Company_Desktop_Agent_Package.zip...");
    // Use Tar or PowerShell to zip win-unpacked directory
    execSync(
      `powershell -Command "Compress-Archive -Path '${unpackedDir}\\*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: "inherit" }
    );
    console.log("Zip package created successfully at:", zipPath);
  } catch (err) {
    console.error("Failed to compress win-unpacked package:", err.message);
  }
} else {
  console.error("win-unpacked directory does not exist.");
}
