import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { applyTheme, currentTheme } from '../utils/app/theme'

const CHORD_STYLE_KEY = 'atril.chordStyle'
const INSTRUMENT_KEY = 'atril.instrumentProfile'

// Instrumento Offset: Concert=0, Bb=+2, Eb=+9
// (offset que hay que sumar ANTES de la transposición manual del usuario)
export const INSTRUMENT_OFFSETS = {
  concert: 0,
  Bb: 2,   // Trompeta, Clarinete, Saxo Tenor — +2 semitonos
  Eb: 9,   // Saxo Alto, Saxo Barítono — +9 semitonos
}

const SettingsContext = createContext(null)

function readStoredInstrumentProfile() {
  try {
    const v = localStorage.getItem(INSTRUMENT_KEY)
    if (['concert', 'Bb', 'Eb'].includes(v)) return v
    return 'concert'
  } catch {
    return 'concert'
  }
}

function readStoredChordStyle() {
  try {
    const v = localStorage.getItem(CHORD_STYLE_KEY)
    return v === 'solfege' ? 'solfege' : 'letters'
  } catch {
    return 'letters'
  }
}

export function SettingsProvider({ children }) {
  const [theme, setThemeState] = useState(() => currentTheme())
  const [chordStyle, setChordStyleState] = useState(() => readStoredChordStyle())
  const [instrumentProfile, setInstrumentProfileState] = useState(() => readStoredInstrumentProfile())

  // Stay in sync if anything else mutates the html data-theme attribute
  // (e.g. the system-preference watcher set up in main.jsx).
  useEffect(() => {
    if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return
    const obs = new MutationObserver(() => {
      const next = currentTheme()
      setThemeState(prev => (prev === next ? prev : next))
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  // Cross-tab sync for chord style and instrument
  useEffect(() => {
    if (typeof window === 'undefined') return
    function onStorage(e) {
      if (e.key === CHORD_STYLE_KEY) {
        setChordStyleState(e.newValue === 'solfege' ? 'solfege' : 'letters')
      } else if (e.key === INSTRUMENT_KEY) {
        setInstrumentProfileState(['concert', 'Bb', 'Eb'].includes(e.newValue) ? e.newValue : 'concert')
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = useCallback((next) => {
    const t = next === 'dark' ? 'dark' : 'light'
    applyTheme(t, { persist: true })
    setThemeState(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next, { persist: true })
      return next
    })
  }, [])

  const setInstrumentProfile = useCallback((profile) => {
    const p = ['concert', 'Bb', 'Eb'].includes(profile) ? profile : 'concert'
    try { localStorage.setItem(INSTRUMENT_KEY, p) } catch {}
    setInstrumentProfileState(p)
  }, [])

  const setChordStyle = useCallback((style) => {
    const s = style === 'solfege' ? 'solfege' : 'letters'
    try { localStorage.setItem(CHORD_STYLE_KEY, s) } catch {}
    setChordStyleState(s)
  }, [])

  const toggleChordStyle = useCallback(() => {
    setChordStyleState(prev => {
      const next = prev === 'solfege' ? 'letters' : 'solfege'
      try { localStorage.setItem(CHORD_STYLE_KEY, next) } catch {}
      return next
    })
  }, [])

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme,
    chordStyle,
    setChordStyle,
    toggleChordStyle,
    instrumentProfile,
    setInstrumentProfile,
  }), [theme, setTheme, toggleTheme, chordStyle, setChordStyle, toggleChordStyle, instrumentProfile, setInstrumentProfile])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    return {
      theme: typeof document !== 'undefined' ? currentTheme() : 'light',
      setTheme: () => {},
      toggleTheme: () => {},
      chordStyle: readStoredChordStyle(),
      setChordStyle: () => {},
      toggleChordStyle: () => {},
      instrumentProfile: readStoredInstrumentProfile(),
      setInstrumentProfile: () => {},
    }
  }
  return ctx
}

export function useChordStyle() {
  return useSettings().chordStyle
}

export function useInstrumentProfile() {
  return useSettings().instrumentProfile
}
