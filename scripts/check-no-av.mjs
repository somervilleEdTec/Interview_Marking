#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const banned = [
  /getUserMedia/,
  /mediaDevices/,
  /getDisplayMedia/,
  /webkitGetUserMedia/,
  /navigator\.mediaDevices/
]

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'out' || name === 'release' || name === 'dist') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, files)
    else if (/\.(ts|js|mjs|cjs|tsx|jsx)$/.test(name) && !p.includes('check-no-av')) files.push(p)
  }
  return files
}

const files = walk(process.cwd())
const hits = []
for (const f of files) {
  const text = readFileSync(f, 'utf8')
  for (const re of banned) {
    if (re.test(text)) hits.push(`${f} matches ${re}`)
  }
}

if (hits.length) {
  console.error('AV permission APIs forbidden:\n' + hits.join('\n'))
  process.exit(1)
}
console.log('check:av passed — no mic/camera/screen-capture APIs found')
