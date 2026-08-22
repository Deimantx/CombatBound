import { Backpack, BookOpen, CircleHelp, Hammer, House, Pickaxe, Settings, ShieldCheck, Sparkles, Swords } from 'lucide-react'
import type { ComponentType } from 'react'
import type { ScreenId } from '../shared/types'

export interface NavigationItem {
  id: ScreenId
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  description: string
}

export const navigationItems: NavigationItem[] = [
  { id: 'home', label: 'Home', icon: House, description: 'Combat overview' },
  { id: 'combat', label: 'Combat', icon: Swords, description: 'Fight and select targets' },
  { id: 'hero', label: 'Hero', icon: ShieldCheck, description: 'Equipment, Magic Arts and combat setup' },
  { id: 'proficiencies', label: 'Proficiencies', icon: Sparkles, description: 'Train weapons and spend Perks' },
  { id: 'mining', label: 'Mining', icon: Pickaxe, description: 'Mine Iron Veins and grow Mining mastery' },
  { id: 'blacksmithing', label: 'Blacksmithing', icon: Hammer, description: 'Smelt ore, smith Iron gear, and upgrade exact items' },
  { id: 'inventory', label: 'Inventory', icon: Backpack, description: 'Review carried items' },
  { id: 'collection', label: 'Collection Log', icon: BookOpen, description: 'Track discoveries' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Prototype preferences' },
  { id: 'info', label: 'Info', icon: CircleHelp, description: 'About the interface' },
]

export const screenTitles: Record<ScreenId, { title: string; subtitle: string }> = {
  home: { title: 'Home', subtitle: 'A clear view of your combat journey.' },
  combat: { title: 'Combat', subtitle: 'Hunt enemy groups, manage combat decisions, and survive repeated encounters.' },
  hero: { title: 'Hero', subtitle: 'Prepare your equipment, magic and combat behavior.' },
  proficiencies: { title: 'Proficiencies', subtitle: 'Improve the weapons you actually use.' },
  mining: { title: 'Mining', subtitle: 'Break Iron Veins, build Mining skill, and shape your profession.' },
  blacksmithing: { title: 'Blacksmithing', subtitle: 'Smelt raw ore, forge base equipment, and permanently specialize exact gear.' },
  inventory: { title: 'Inventory', subtitle: 'Review carried items and equipment.' },
  collection: { title: 'Collection Log', subtitle: 'Track the items and targets you have discovered.' },
  settings: { title: 'Settings', subtitle: 'Tune presentation and prototype preferences.' },
  info: { title: 'Info', subtitle: 'Learn how the CombatBound interface fits together.' },
}
