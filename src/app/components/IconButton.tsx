import type { LucideIcon } from 'lucide-react'

export function IconButton({ icon: Icon, label, onClick, className = '' }: { icon: LucideIcon; label: string; onClick?: () => void; className?: string }) {
  return <button className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}><Icon size={16} /></button>
}
