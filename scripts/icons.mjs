import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public', 'favicon.svg'))
const out = join(root, 'public', 'icons')
mkdirSync(out, { recursive: true })

const targets = [
  ['icon-512.png', 512],
  ['icon-512-maskable.png', 512],
  ['icon-192.png', 192],
  ['icon-64.png', 64],
]

for (const [name, size] of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(join(out, name))
  console.log('wrote', name)
}

// Story / social preview (1280x640) on pure black with the mark on the left.
const mark = await sharp(svg, { density: 384 }).resize(520, 520).png().toBuffer()
await sharp({
  create: {
    width: 1280,
    height: 640,
    channels: 4,
    background: { r: 7, g: 7, b: 8, alpha: 1 },
  },
})
  .composite([{ input: mark, left: 96, top: 60 }])
  .png()
  .toFile(join(root, 'public', 'social-preview.png'))

console.log('wrote social-preview.png')
