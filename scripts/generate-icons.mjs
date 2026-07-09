// One-off script to generate PWA icon PNGs (no image library available in this env).
// Draws a simple barbell glyph on a rounded background, writes raw PNG bytes via zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");

const BG = [15, 23, 42]; // slate-900
const FG = [56, 189, 248]; // sky-400

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function drawBarbell(size, padding) {
  const px = new Array(size * size);
  const inner = size - padding * 2;
  const cx = size / 2, cy = size / 2;
  const barHeight = Math.max(2, Math.round(inner * 0.09));
  const barHalfLen = inner * 0.34;
  const plateW = Math.max(3, Math.round(inner * 0.11));
  const plateH = inner * 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = BG;
      const dx = x - cx, dy = y - cy;

      const onBar = Math.abs(dy) <= barHeight / 2 && Math.abs(dx) <= barHalfLen;
      const plateCx = barHalfLen;
      const onLeftPlate = Math.abs(dx + plateCx) <= plateW / 2 && Math.abs(dy) <= plateH / 2;
      const onRightPlate = Math.abs(dx - plateCx) <= plateW / 2 && Math.abs(dy) <= plateH / 2;

      if (onBar || onLeftPlate || onRightPlate) color = FG;

      px[y * size + x] = color;
    }
  }
  return px;
}

function buildPng(size, { maskable = false } = {}) {
  const padding = maskable ? size * 0.22 : size * 0.14;
  const pixels = drawBarbell(size, padding);

  const raw = Buffer.alloc(size * (size * 3 + 1));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels[y * size + x];
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

import { mkdirSync } from "node:fs";
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, "icon-192.png"), buildPng(192));
writeFileSync(join(outDir, "icon-512.png"), buildPng(512));
writeFileSync(join(outDir, "icon-maskable-512.png"), buildPng(512, { maskable: true }));
writeFileSync(join(outDir, "apple-touch-icon.png"), buildPng(180));

console.log("Icons written to", outDir);
