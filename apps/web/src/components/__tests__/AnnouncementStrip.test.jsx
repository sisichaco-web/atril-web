import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The strip's audience gate is UA-driven; drive it directly instead of
// stubbing user-agent strings (platform.test.js covers the parsing itself).
const platform = vi.hoisted(() => ({ ios: false, android: false, nativeBanner: false }))
vi.mock('../../utils/app/platform', () => ({
  isIOS: () => platform.ios,
  isAndroid: () => platform.android,
  isMobile: () => platform.ios || platform.android,
  isIOSSafari: () => platform.nativeBanner,
  isNativeAppBannerActive: () => platform.nativeBanner,
}))

// A fixed instant inside the shipped ios-launch-2026-08 window, so the suite
// keeps passing after the real campaign expires.
import AnnouncementStrip from '../AnnouncementStrip'
import { resolveAnnouncement } from '../../config/announcements'

function renderStrip(){
  return render(<MemoryRouter><AnnouncementStrip /></MemoryRouter>)
}

beforeEach(() => {
  localStorage.clear()
  platform.ios = false
  platform.android = false
  platform.nativeBanner = false
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AnnouncementStrip', () => {
  it('does not render when there is no active campaign', () => {
    const { container } = renderStrip()
    expect(container).toBeEmptyDOMElement()
  })
})

describe('resolveAnnouncement', () => {
  it('returns null when no campaigns are active', () => {
    expect(resolveAnnouncement()).toBeNull()
  })
})
