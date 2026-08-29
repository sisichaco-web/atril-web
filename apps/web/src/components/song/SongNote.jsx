import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

/**
 * SongNote — anotación privada por canción y usuario.
 * Cada usuario solo puede ver y editar sus propias notas (RLS via user_id = auth.uid()).
 * Se guarda automáticamente 1 segundo después de dejar de escribir (debounce).
 */
export default function SongNote({ songId }) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)
  const saveTimer = useRef(null)

  // Cargar nota al abrir
  useEffect(() => {
    if (!open || !session?.user?.id || !songId) return
    setLoaded(false)
    supabase
      .from('notes')
      .select('content')
      .eq('song_id', songId)
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) { setError('No se pudo cargar la nota.'); setLoaded(true); return }
        setContent(data?.content ?? '')
        setLoaded(true)
        setError(null)
      })
  }, [open, session?.user?.id, songId])

  // Guardar con debounce
  const save = useCallback(async (text) => {
    if (!session?.user?.id || !songId) return
    setSaving(true)
    const { error: err } = await supabase
      .from('notes')
      .upsert(
        { user_id: session.user.id, song_id: songId, content: text },
        { onConflict: 'user_id,song_id' }
      )
    setSaving(false)
    if (err) setError('Error al guardar.')
    else setError(null)
  }, [session?.user?.id, songId])

  const handleChange = (e) => {
    const val = e.target.value
    setContent(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(val), 1000)
  }

  if (!session) return null // No mostrar si no está logueado

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <button
        className="gc-btn gc-btn--sm"
        onClick={() => setOpen(o => !o)}
        title="Mi nota privada"
        aria-label="Nota privada para esta canción"
        style={{ gap: 6, display: 'flex', alignItems: 'center' }}
      >
        <span style={{ fontSize: '1.1em' }}>📝</span>
        {open ? 'Cerrar nota' : 'Mi nota'}
      </button>

      {open && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.75rem',
          borderRadius: 10,
          border: '1px solid var(--gc-separator)',
          background: 'var(--gc-surface-1)',
        }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.4rem' }}>
            Nota privada — solo vos la ves
          </div>
          {!loaded ? (
            <div style={{ opacity: 0.5, fontSize: '0.9rem' }}>Cargando…</div>
          ) : (
            <textarea
              value={content}
              onChange={handleChange}
              placeholder="Escribí tus notas aquí (capo, cambios de clave, observaciones…)"
              style={{
                width: '100%',
                minHeight: 90,
                resize: 'vertical',
                background: 'var(--gc-surface-2)',
                border: '1px solid var(--gc-separator)',
                borderRadius: 8,
                padding: '0.5rem',
                color: 'var(--gc-text)',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
              }}
            />
          )}
          {error && <div style={{ color: 'var(--gc-danger)', fontSize: '0.8rem', marginTop: 4 }}>{error}</div>}
          {saving && <div style={{ opacity: 0.5, fontSize: '0.8rem', marginTop: 4 }}>Guardando…</div>}
          {!saving && loaded && content && !error && (
            <div style={{ opacity: 0.5, fontSize: '0.8rem', marginTop: 4 }}>✓ Guardado</div>
          )}
        </div>
      )}
    </div>
  )
}
