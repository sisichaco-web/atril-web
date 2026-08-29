import fs from 'fs'
import path from 'path'

const file = path.join(process.cwd(), 'apps', 'web', 'src', 'hooks', 'useSettings.jsx')
let content = fs.readFileSync(file, 'utf8')

// If not already patched with instrument logic
if (!content.includes('instrumentProfile')) {
  // 1. Add INSTRUMENT_KEY
  content = content.replace(/const CHORD_STYLE_KEY = 'atril\.chordStyle'/g, 
    "const CHORD_STYLE_KEY = 'atril.chordStyle'\nconst INSTRUMENT_KEY = 'atril.instrumentProfile'")

  // 2. Add readStoredInstrumentProfile
  content = content.replace(/function readStoredChordStyle/, `function readStoredInstrumentProfile() {
  try {
    const v = localStorage.getItem(INSTRUMENT_KEY)
    if (['concert', 'Bb', 'Eb'].includes(v)) return v
    return 'concert'
  } catch {
    return 'concert'
  }
}

function readStoredChordStyle`)

  // 3. Add to SettingsProvider state
  content = content.replace(/const \[chordStyle, setChordStyleState\] = useState\(\(\) => readStoredChordStyle\(\)\)/, 
    "const [chordStyle, setChordStyleState] = useState(() => readStoredChordStyle())\n  const [instrumentProfile, setInstrumentProfileState] = useState(() => readStoredInstrumentProfile())")

  // 4. Cross-tab sync
  content = content.replace(/if \(e\.key !== CHORD_STYLE_KEY\) return\n      setChordStyleState\(e\.newValue === 'solfege' \? 'solfege' : 'letters'\)/, 
    `if (e.key === CHORD_STYLE_KEY) {
        setChordStyleState(e.newValue === 'solfege' ? 'solfege' : 'letters')
      } else if (e.key === INSTRUMENT_KEY) {
        setInstrumentProfileState(['concert', 'Bb', 'Eb'].includes(e.newValue) ? e.newValue : 'concert')
      }`)

  // 5. Add setter
  content = content.replace(/const setChordStyle = useCallback/, `const setInstrumentProfile = useCallback((profile) => {
    const p = ['concert', 'Bb', 'Eb'].includes(profile) ? profile : 'concert'
    try { localStorage.setItem(INSTRUMENT_KEY, p) } catch {}
    setInstrumentProfileState(p)
  }, [])

  const setChordStyle = useCallback`)

  // 6. Update context value
  content = content.replace(/toggleChordStyle,\n  }\), \[/, `toggleChordStyle,
    instrumentProfile,
    setInstrumentProfile,
  }), [`)

  content = content.replace(/toggleChordStyle\]\)/, `toggleChordStyle, instrumentProfile, setInstrumentProfile])`)

  // 7. Update fallback context
  content = content.replace(/toggleChordStyle: \(\) => \{\},\n    \}/, `toggleChordStyle: () => {},
      instrumentProfile: readStoredInstrumentProfile(),
      setInstrumentProfile: () => {},
    }`)

  // 8. Add useInstrument hook
  content = content + `\nexport function useInstrumentProfile() {
  return useSettings().instrumentProfile
}\n`

  fs.writeFileSync(file, content, 'utf8')
  console.log('useSettings.jsx updated successfully.')
} else {
  console.log('Already updated.')
}
