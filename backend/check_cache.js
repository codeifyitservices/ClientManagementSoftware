import fs from "fs";
import path from "path";

const root = "C:\\Users\\umang\\AppData\\Local\\electron-builder\\Cache";

if (fs.existsSync(root)) {
  console.log("CACHE ROOT DIRECTORIES:", fs.readdirSync(root));
  for (const item of fs.readdirSync(root)) {
    const full = path.join(root, item);
    if (fs.statSync(full).isDirectory()) {
      console.log(`[DIR] ${item}:`, fs.readdirSync(full).filter(x => fs.statSync(path.join(full, x)).isDirectory()));
    }
  }
} else {
  console.log("Cache root does not exist");
}
