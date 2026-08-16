export type TooltipTone = 'default' | 'gold' | 'blue' | 'green' | 'red'

export interface TooltipRow {
  label: string
  value: string
  tone?: TooltipTone
}

export interface TooltipSection {
  id: string
  title?: string
  rows?: TooltipRow[]
  notes?: string[]
}

export interface TooltipModel {
  id: string
  icon?: string
  title: string
  subtitle?: string
  tone?: TooltipTone
  description?: string
  rows?: TooltipRow[]
  sections?: TooltipSection[]
  notes?: string[]
}
