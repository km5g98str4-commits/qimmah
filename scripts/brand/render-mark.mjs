import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ember = '#F0512A'
const mark = '<path d="M302 640 L512 340 L722 640" fill="none" stroke="#fff" stroke-width="96" stroke-linecap="round" stroke-linejoin="round"/><circle cx="302" cy="640" r="96" fill="#fff"/><circle cx="722" cy="640" r="96" fill="#fff"/>'
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="230" fill="${ember}"/>${mark}</svg>`
const plain = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${mark}</svg>`
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="${ember}"/><g transform="translate(854 854)">${mark}</g></svg>`

const generated = resolve(root, 'scripts/brand/generated')
mkdirSync(generated, { recursive: true })
writeFileSync(resolve(generated, 'qimmah-icon.svg'), icon)
writeFileSync(resolve(generated, 'qimmah-mark.svg'), plain)
writeFileSync(resolve(generated, 'qimmah-splash.svg'), splash)
writeFileSync(resolve(root, 'public/favicon.svg'), icon)
mkdirSync(resolve(root, 'site/assets'), { recursive: true })
writeFileSync(resolve(root, 'site/assets/favicon.svg'), icon)

const icon1024 = resolve(generated, 'icon-1024.png')
execFileSync('sips', ['-s', 'format', 'png', resolve(generated, 'qimmah-icon.svg'), '--out', icon1024], { stdio: 'ignore' })
const targets = [
  ['public/icon-192.png', 192], ['public/icon-512.png', 512],
  ['public/icon-maskable-192.png', 192], ['public/icon-maskable-512.png', 512],
  ['public/apple-touch-icon.png', 180], ['public/og-image.png', 1024],
  ...[20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024]
    .map((size) => [`ios/App/App/Assets.xcassets/AppIcon.appiconset/icon-${size}.png`, size]),
]
for (const [relative, size] of targets) {
  const out = resolve(root, relative)
  mkdirSync(dirname(out), { recursive: true })
  execFileSync('sips', ['-z', String(size), String(size), icon1024, '--out', out], { stdio: 'ignore' })
}
const splashPng = resolve(generated, 'splash-2732.png')
execFileSync('sips', ['-s', 'format', 'png', resolve(generated, 'qimmah-splash.svg'), '--out', splashPng], { stdio: 'ignore' })
for (const n of ['', '-1', '-2']) copyFileSync(splashPng, resolve(root, `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732${n}.png`))
console.log('canonical mark rendered: web/PWA, every declared iOS icon size, OG and splash')
