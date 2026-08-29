import fs from 'fs'
import path from 'path'

// Los imports de workspace en código fuente (@atril/core, @atril/tokens) 
// deben mantenerse con el scope original @gracechords en node_modules.
// Revertimos solo los imports de módulos que existen como paquetes npm en node_modules.

const dirsToScan = [
  path.join(process.cwd(), 'apps', 'web', 'src'),
  path.join(process.cwd(), 'packages', 'core', 'src'),
]

const walk = (dir) => {
  if (!fs.existsSync(dir)) return []
  let results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat && stat.isDirectory()) results = results.concat(walk(fullPath))
    else results.push(fullPath)
  }
  return results
}

let files = []
dirsToScan.forEach(p => { if (fs.existsSync(p)) files = files.concat(walk(p)) })

// Agregar archivos CSS específicos
files.push(path.join(process.cwd(), 'apps', 'web', 'src', 'styles', 'index.css'))
files = files.filter((f, i, a) => a.indexOf(f) === i) // dedup

let changedCount = 0
files.forEach(f => {
  try {
    const ext = path.extname(f)
    // Solo archivos de código/css
    if (!['.js', '.jsx', '.ts', '.tsx', '.css', '.json'].includes(ext)) return
    let content = fs.readFileSync(f, 'utf8')
    // Revertir @atril/tokens, @atril/core, @atril/web a @gracechords/* en imports de módulos
    // (no en textos de UI, package.json de workspace raíz o scripts)
    const orig = content
    content = content.replace(/@atril\/(tokens|core|web)\b/g, '@gracechords/$1')
    if (content !== orig) {
      fs.writeFileSync(f, content, 'utf8')
      changedCount++
      console.log('Reverted:', path.relative(process.cwd(), f))
    }
  } catch { /* binary or inaccessible */ }
})

console.log(`\nReverted package scope in ${changedCount} files (keeping @gracechords/* for npm packages)`)
