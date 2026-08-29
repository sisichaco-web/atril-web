import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function SiteDisclaimer(){
  const { t } = useTranslation('common')
  const { pathname, hash } = useLocation()
  
  const inLive = (pathname && pathname.startsWith('/live')) || (hash && hash.includes('/live'))
  const inSession = (pathname && pathname.startsWith('/s/')) || (hash && hash.includes('/s/'))
  
  if (inLive) return null
  if (inSession) return null
  
  return (
    <footer style={{ marginTop: '3rem' }}>
      <div
        style={{
          fontSize: '0.85rem',
          opacity: 0.75,
          textAlign: 'center',
          padding: '1rem',
          borderTop: '1px solid var(--gc-separator, rgba(127,127,127,0.2))',
          maxWidth: 920,
          margin: '0 auto'
        }}
      >
        <div>Atril — por Sisirock</div>
        <div style={{ height: '0.5em' }} aria-hidden="true" />
      </div>
    </footer>
  )
}
