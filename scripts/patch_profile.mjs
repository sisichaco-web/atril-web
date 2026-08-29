import fs from 'fs'
import path from 'path'

const file = path.join(process.cwd(), 'apps', 'web', 'src', 'pages', 'ProfilePage.jsx')
let content = fs.readFileSync(file, 'utf8')

if (!content.includes('useInstrumentProfile')) {
  // Add import
  content = content.replace(/import LanguageSelector from '\.\.\/components\/ui\/LanguageSelector'/, 
    "import LanguageSelector from '../components/ui/LanguageSelector'\nimport { useSettings, useInstrumentProfile } from '../hooks/useSettings'")

  // Add state usage inside component
  content = content.replace(/const location = useLocation\(\)/, 
    "const location = useLocation()\n  const { instrumentProfile, setInstrumentProfile } = useSettings()")

  // Add the UI element
  const instrumentHtml = `
            <div className="gc-settings__field">
              <label>Instrumento</label>
              <select className="gc-input" value={instrumentProfile} onChange={(e) => setInstrumentProfile(e.target.value)}>
                <option value="concert">Concert (Piano, Guitarra, etc - Tono original)</option>
                <option value="Bb">Instrumento en Sib (Trompeta, Clarinete, Saxo Tenor)</option>
                <option value="Eb">Instrumento en Mib (Saxo Alto, Saxo Barítono)</option>
              </select>
              <div className="gc-help">Ajusta la transposición mostrada automáticamente para tu instrumento.</div>
            </div>
`
  content = content.replace(/<LanguageSelector \/>\s*<\/div>/, `<LanguageSelector />
            </div>${instrumentHtml}`)

  fs.writeFileSync(file, content, 'utf8')
  console.log('ProfilePage updated with Instrument Selector')
} else {
  console.log('ProfilePage already has Instrument Selector')
}
