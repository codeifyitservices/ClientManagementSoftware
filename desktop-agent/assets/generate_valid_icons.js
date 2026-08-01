const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Helper to calculate CRC32 checksum for PNG chunks
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

// Function to generate a valid 256x256 RGBA PNG buffer
function createValidPngBuffer(width = 256, height = 256, r = 59, g = 130, b = 246) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA (6)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = createChunk("IHDR", ihdrData);

  // Raw Image Data (Filter 0 for each scanline)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r; // Red
      rawData[pxOffset + 1] = g; // Green
      rawData[pxOffset + 2] = b; // Blue
      rawData[pxOffset + 3] = 255; // Alpha
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk("IDAT", compressedData);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const typeAndData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

// Generate valid assets
const assetsDir = __dirname;

const mainIconPng = createValidPngBuffer(256, 256, 59, 130, 246); // Blue app icon
const activeTrayPng = createValidPngBuffer(64, 64, 16, 185, 129); // Green
const idleTrayPng = createValidPngBuffer(64, 64, 245, 158, 11); // Yellow
const breakTrayPng = createValidPngBuffer(64, 64, 59, 130, 246); // Blue
const offlineTrayPng = createValidPngBuffer(64, 64, 239, 68, 68); // Red

fs.writeFileSync(path.join(assetsDir, "icon.png"), mainIconPng);
fs.writeFileSync(path.join(assetsDir, "tray-active.png"), activeTrayPng);
fs.writeFileSync(path.join(assetsDir, "tray-idle.png"), idleTrayPng);
fs.writeFileSync(path.join(assetsDir, "tray-break.png"), breakTrayPng);
fs.writeFileSync(path.join(assetsDir, "tray-offline.png"), offlineTrayPng);

// Remove corrupt icon.ico so electron-builder automatically auto-generates .ico from valid icon.png
const icoPath = path.join(assetsDir, "icon.ico");
if (fs.existsSync(icoPath)) {
  fs.unlinkSync(icoPath);
}

console.log("Valid 256x256 PNG icons generated successfully with correct CRC32 checksums.");
