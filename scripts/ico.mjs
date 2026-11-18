/**
 * Builds build/icon.ico (Windows) from the 512px app icon.
 * Each size is embedded as PNG, which Windows Vista+ understands.
 */
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const SOURCE = 'public/icons/icon-512.png'
const TARGET = 'build/icon.ico'
const SIZES = [16, 24, 32, 48, 64, 128, 256]

const pngs = await Promise.all(
  SIZES.map((size) => sharp(SOURCE).resize(size, size, { fit: 'cover' }).png({ compressionLevel: 9 }).toBuffer()),
)

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(SIZES.length, 4)

const entries = []
let offset = 6 + 16 * SIZES.length
SIZES.forEach((size, index) => {
  const entry = Buffer.alloc(16)
  entry.writeUInt8(size >= 256 ? 0 : size, 0)
  entry.writeUInt8(size >= 256 ? 0 : size, 1)
  entry.writeUInt8(0, 2)
  entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngs[index].length, 8)
  entry.writeUInt32LE(offset, 12)
  offset += pngs[index].length
  entries.push(entry)
})

mkdirSync(dirname(TARGET), { recursive: true })
writeFileSync(TARGET, Buffer.concat([header, ...entries, ...pngs]))
console.log(`icon.ico written (${SIZES.join(', ')} px)`)
