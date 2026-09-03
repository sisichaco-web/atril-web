import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { reviewSongSuggestion, fetchPendingAdditionSuggestions } from '@gracechords/core'
import { useRole } from '../../hooks/useRole'
import { invalidateSongsCache } from '../../hooks/useSongs'
import { showToast } from '../../utils/app/toast'

function formatDate(str) {
  if (!str) return ''
  try {
    return new Date(str).toLocaleString()
  } catch {
    return str
  }
}

function MetadataDiff({ oldPayload, newPayload }) {
  const { t } = useTranslation('editor')
  const FIELDS = [
    'title', 'artist', 'default_key', 'tempo', 'time_signature',
    'country', 'youtube_id', 'mp3_url', 'pptx_url', 'slug', 'tags',
  ]

  const diffs = FIELDS.filter(f => {
    const oldVal = JSON.stringify(oldPayload?.[f] ?? '')
    const newVal = JSON.stringify(newPayload?.[f] ?? '')
    return oldVal !== newVal
  })

  if (diffs.length === 0) return null

  return (
    <div className="gc-suggestion-card__diff-section">
      <div className="gc-suggestion-card__diff-title">{t('metadataChanges')}</div>
      {diffs.map(f => (
        <div key={f} className="gc-suggestion-card__diff-row">
          <span className="gc-suggestion-card__diff-key">{f}</span>
          <span className="gc-suggestion-card__diff-new">
            {JSON.stringify(newPayload?.[f] ?? '')}
          </span>
        </div>
      ))}
    </div>
  )
}

function ContentDiff({ newContent }) {
  const { t } = useTranslation('editor')
  if (!newContent) return null

  const newLines = (newContent || '').split('\n')

  // Show all lines as added
  const rows = newLines.map(line => ({ type: 'added', text: line }))

  return (
    <div className="gc-suggestion-card__diff-section">
      <div className="gc-suggestion-card__diff-title">{t('contentChanges')}</div>
      <div className="gc-suggestion-card__content-diff">
        {rows.map((row, i) => (
          <div
            key={i}
            className="gc-suggestion-card__diff-line--added"
          >
            + {row.text}
          </div>
        ))}
      </div>
    </div>
  )
}

function RejectionForm({ onSubmit, onCancel }) {
  const { t } = useTranslation('editor')
  const [reason, setReason] = useState('')

  return (
    <div className="gc-rejection-form">
      <textarea
        className="gc-rejection-form__textarea"
        placeholder={t('rejectionReason')}
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <div className="gc-rejection-form__actions">
        <button
          type="button"
          className="gc-btn gc-btn--destructive gc-btn--sm"
          onClick={() => onSubmit(reason)}
        >
          {t('confirmRejection')}
        </button>
        <button
          type="button"
          className="gc-btn gc-btn--secondary gc-btn--sm"
          onClick={onCancel}
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

function AdditionSuggestionCard({ suggestion, onApproved, onRejected, onTouchUp }) {
  const { t } = useTranslation('editor')
  const [rejecting, setRejecting] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleApprove() {
    if (loading) return
    setLoading(true)
    try {
      await reviewSongSuggestion(supabase, suggestion.id, 'approve')
      invalidateSongsCache()

      showToast(t('suggestionApproved'))
      onApproved(suggestion.id)
    } catch (err) {
      showToast(`Error applying suggestion: ${err.message}`)
    }
    setLoading(false)
  }

  async function handleReject(reason) {
    if (loading) return
    setLoading(true)
    try {
      await reviewSongSuggestion(supabase, suggestion.id, 'reject', reason || null)
      showToast(t('suggestionRejected'))
      onRejected(suggestion.id)
    } catch (err) {
      showToast(`Error rejecting suggestion: ${err.message}`)
    }
    setLoading(false)
    setRejecting(false)
  }

  return (
    <div className="gc-suggestion-card gc-suggestion-card--addition">
      <div className="gc-suggestion-card__header">
        <span className="gc-suggestion-card__proposer">
          {suggestion.users?.display_name || t('unknownUser')}
        </span>
        <span className="gc-suggestion-card__meta">{formatDate(suggestion.created_at)}</span>
        <span className="gc-suggestion-card__badge gc-suggestion-card__badge--addition">
          {t('newSong')}
        </span>
      </div>

      <div className="gc-suggestion-card__body">
        {suggestion.proposer_note && (
          <div className="gc-suggestion-card__note">
            "{suggestion.proposer_note}"
          </div>
        )}

        <MetadataDiff
          oldPayload={null}
          newPayload={suggestion.payload}
        />
        <ContentDiff
          newContent={suggestion.payload?.chordpro_content}
        />
      </div>

      <div className="gc-suggestion-card__actions">
        <button
          type="button"
          className="gc-btn gc-btn--primary gc-btn--sm"
          onClick={handleApprove}
          disabled={loading}
        >
          {t('approve')}
        </button>
        <button
          type="button"
          className="gc-btn gc-btn--secondary gc-btn--sm"
          onClick={() => onTouchUp(suggestion)}
          disabled={loading}
        >
          {t('touchUp')}
        </button>
        <button
          type="button"
          className="gc-btn gc-btn--destructive gc-btn--sm"
          onClick={() => setRejecting(true)}
          disabled={loading}
        >
          {t('reject')}
        </button>
      </div>

      {rejecting && (
        <RejectionForm
          onSubmit={handleReject}
          onCancel={() => setRejecting(false)}
        />
      )}
    </div>
  )
}

export default function PendingAdditionSuggestionsPanel({ onApproved, onRejected, onTouchUp }) {
  const { t } = useTranslation('editor')
  const { isAtLeast } = useRole()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAtLeast('editor')) return

    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const data = await fetchPendingAdditionSuggestions(supabase)
        if (!cancelled) {
          setSuggestions(data || [])
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => { cancelled = true }
  }, [isAtLeast])

  if (!isAtLeast('editor')) return null

  function handleApproved(id) {
    setSuggestions(s => s.filter(x => x.id !== id))
    if (onApproved) onApproved(id)
  }

  function handleRejected(id) {
    setSuggestions(s => s.filter(x => x.id !== id))
    if (onRejected) onRejected(id)
  }

  return (
    <div className="gc-suggestion-review gc-portal-section">
      <h2>{t('pendingNewSongs')}</h2>

      {error && (
        <p style={{ color: 'var(--gc-danger)' }}>{t('suggestionsLoadError')}: {error}</p>
      )}

      {loading && <p className="gc-suggestion-review__empty">{t('loadingSuggestions')}</p>}

      {!loading && !error && suggestions.length === 0 && (
        <p className="gc-suggestion-review__empty">{t('noNewSuggestions')}</p>
      )}

      {!loading && !error && suggestions.length > 0 && (
        <div className="gc-suggestion-review__list">
          {suggestions.map(suggestion => (
            <AdditionSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onApproved={handleApproved}
              onRejected={handleRejected}
              onTouchUp={onTouchUp}
            />
          ))}
        </div>
      )}
    </div>
  )
}
