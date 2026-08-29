import React from 'react'
import {
  DrumIcon,
  GuitarIcon,
  MicVocalIcon,
  Music2Icon,
  PianoIcon,
} from '../Icons'

const SIZE_MAP = { sm: 32, md: 44, card: 64, lg: 80 }

export const DEFAULT_SPRITE = 'notes'

const INSTRUMENT_ICONS = {
  guitar: GuitarIcon,
  acoustic: GuitarIcon,
  drums: DrumIcon,
  saxophone: Music2Icon,
  bass: GuitarIcon,
  mic: MicVocalIcon,
  keys: PianoIcon,
  congas: DrumIcon,
}

export default function SpriteAvatar({ sprite, size = 'md', className = '' }) {
  const id = sprite || DEFAULT_SPRITE
  const px = SIZE_MAP[size] ?? SIZE_MAP.md
  const InstrumentIcon = INSTRUMENT_ICONS[id]
  return (
    <div
      className={`gc-sprite-avatar gc-sprite-avatar--${size} ${className}`}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      {InstrumentIcon ? (
        <InstrumentIcon size={px * 0.48} strokeWidth={1.8} />
      ) : (
        <img src={`/sprites/${id}.webp`} alt="" width={px} height={px} />
      )}
    </div>
  )
}
