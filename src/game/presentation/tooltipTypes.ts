export type TooltipTone = 'default' | 'gold' | 'blue' | 'green' | 'red'

export interface TooltipRow {
  label: string
  value: string
  tone?: TooltipTone
}

export interface TooltipModel {
  id: string
  icon?: string
  title: string
  subtitle?: string
  tone?: TooltipTone
  description?: string
  rows?: TooltipRow[]
  notes?: string[]
}
