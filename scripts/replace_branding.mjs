import fs from 'fs'
import path from 'path'

const walk = (dir) => {
  let results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath))
    } else {
      results.push(fullPath)
    }
  }
  return results
}

const replaceInFile = (file, regex, replacement) => {
  try {
    const content = fs.readFileSync(file, 'utf8')
    const updated = content.replace(regex, replacement)
    if (content !== updated) {
      fs.writeFileSync(file, updated, 'utf8')
      return true
    }
  } catch (e) {
    // maybe not utf8 or access issue
  }
  return false
}

const dirsToScan = [
  path.join(process.cwd(), 'apps', 'web', 'src'),
  path.join(process.cwd(), 'apps', 'web', 'index.html'),
  path.join(process.cwd(), 'packages', 'core', 'src'),
  path.join(process.cwd(), 'package.json'),
]

let files = []
dirsToScan.forEach(p => {
  if (fs.existsSync(p)) {
    if (fs.statSync(p).isDirectory()) {
      files = files.concat(walk(p))
    } else {
      files.push(p)
    }
  }
})

// Add some specific files
files.push(path.join(process.cwd(), 'apps', 'web', 'public', 'site.webmanifest'))

files = files.filter(f => !f.includes('node_modules') && !f.includes('.git'))

let changedFiles = 0

files.forEach(f => {
  let changed = false
  
  // Replace GraceChords -> Atril
  changed = replaceInFile(f, /GraceChords/g, 'Atril') || changed
  changed = replaceInFile(f, /gracechords/g, 'atril') || changed
  changed = replaceInFile(f, /Gracechords/g, 'Atril') || changed
  
  // Replace references to churches/worship teams with "músicos y bandas"
  changed = replaceInFile(f, /churches, worship teams, and believers/g, 'músicos y bandas') || changed
  changed = replaceInFile(f, /for churches and worship teams/g, 'para músicos') || changed
  changed = replaceInFile(f, /worship tool/g, 'herramienta musical') || changed
  
  // Pages / Route replacements
  changed = replaceInFile(f, /WorshipModePage/g, 'LiveModePage') || changed
  changed = replaceInFile(f, /WorshipMode/g, 'LiveMode') || changed
  changed = replaceInFile(f, /worship mode/gi, 'Live Mode') || changed
  changed = replaceInFile(f, /worship set/gi, 'Setlist Mode') || changed
  changed = replaceInFile(f, /WorshipSetRoutePage/g, 'LiveSetRoutePage') || changed
  changed = replaceInFile(f, /WorshipSetRoute/g, 'LiveSetRoute') || changed
  
  // Replace worship route
  changed = replaceInFile(f, /path="\/worship/g, 'path="/live') || changed
  changed = replaceInFile(f, /to="\/worship/g, 'to="/live') || changed
  changed = replaceInFile(f, /to=\/worship/g, 'to=/live') || changed
  changed = replaceInFile(f, /navigate\('\/worship/g, 'navigate(\'/live') || changed
  changed = replaceInFile(f, /navigate\(`\/worship/g, 'navigate(`/live') || changed
  changed = replaceInFile(f, /navigate\("\/worship/g, 'navigate("/live') || changed

  if (changed) changedFiles++
})

console.log(`Updated ${changedFiles} files with basic branding and worship->live replacement.`)
