const fs = require("fs");
const path = require("path");

const assetsDir = __dirname;
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Valid 16x16 1-pixel color encoded PNG buffers for tray status indicators
// 16x16 Green PNG (Active)
const greenPngBase64 = "iVBORw0KGgoAAAANSU5ACC0lBgAABN1JREFUeJzd001rFEEUx/H/U13T3dMznknExF1vQkREURDxKgQ8CYKCePTgwWs+h4/gzYv4eBMEP+BNEAQ9CSIRvAgieDGIu/jMZDpmurnV48TYwW0ycbfvW91V/1s11V1j3/f1F0p9Z/lJ/i3/K/8W/hb/Ff/t/iv+V/z1+ev/j+/+P/7f0d01nufZ37s0TdN1Xdu2Xde1bdt2Xdd1Xdd1/Zf9A7d/n0iA48hYAAAAAElFTkSuQmCC";

// Generate minimal PNG fallback files
const icons = [
  { name: "tray-active.png" },
  { name: "tray-idle.png" },
  { name: "tray-break.png" },
  { name: "tray-offline.png" },
  { name: "icon.png" },
  { name: "icon.ico" },
];

const simplePngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSU5EUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAUTEVYdFNvZnR3YXJlAEFkb2JlIEltYWdlUmVhZHlxyWU8AAAAE0lEQVR42mNk+M9Qz0ABYBw0AABwYQvRvhD6yAAAAABJRU5ErkJggg==",
  "base64"
);

icons.forEach((icon) => {
  const filePath = path.join(assetsDir, icon.name);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, simplePngBuffer);
  }
});

console.log("Assets created successfully.");
