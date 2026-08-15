import { Backpack, CircleDot, Coins, Footprints, Gem, Hand, HardHat, HeartPulse, Shield, Sparkles, Sword, Target, Wrench } from 'lucide-react'

const icons = { sword: Sword, shield: Shield, ring: CircleDot, cube: Backpack, gem: Gem, necklace: Gem, cross: HeartPulse, coin: Coins, spark: Sparkles, target: Target, helm: HardHat, helmet: HardHat, hand: Hand, gloves: Hand, footprints: Footprints, belt: Wrench, cape: Shield, earring: Sparkles, bug: Target, wrench: Wrench, heart: HeartPulse }

interface PlaceholderArtProps {
  icon?: string
  label?: string
  size?: 'small' | 'medium' | 'large'
  variant?: 'gold' | 'blue' | 'red' | 'muted'
}

export function PlaceholderArt({ icon = 'spark', label, size = 'medium', variant = 'gold' }: PlaceholderArtProps) {
  const Icon = icons[icon as keyof typeof icons] ?? Sparkles
  return <div className={`placeholder-art art-${size} art-${variant}`} aria-label={label}><Icon size={size === 'large' ? 35 : size === 'small' ? 16 : 24} /><span>{label}</span></div>
}
