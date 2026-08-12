import { Backpack, BookOpen, CircleHelp, House, Settings, ShieldCheck, Swords } from 'lucide-react'
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
  { id: 'equipment', label: 'Equipment', icon: ShieldCheck, description: 'Manage combat loadout' },
  { id: 'inventory', label: 'Inventory', icon: Backpack, description: 'Review carried items' },
  { id: 'collection', label: 'Collection Log', icon: BookOpen, description: 'Track discoveries' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Prototype preferences' },
  { id: 'info', label: 'Info', icon: CircleHelp, description: 'About the interface' },
]

export const screenTitles: Record<ScreenId, { title: string; subtitle: string }> = {
  home: { title: 'Home', subtitle: 'A clear view of your combat journey.' },
  combat: { title: 'Combat', subtitle: 'Select a target and engage in live prototype combat.' },
  equipment: { title: 'Equipment', subtitle: 'Manage your current combat loadout.' },
  inventory: { title: 'Inventory', subtitle: 'Review carried items and equipment.' },
  collection: { title: 'Collection Log', subtitle: 'Track the items and targets you have discovered.' },
  settings: { title: 'Settings', subtitle: 'Tune presentation and prototype preferences.' },
  info: { title: 'Info', subtitle: 'Learn how the CombatBound interface fits together.' },
}
