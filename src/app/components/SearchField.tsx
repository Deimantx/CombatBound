import { Search } from 'lucide-react'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}

export function SearchField({ value, onChange, placeholder = 'Search', label = 'Search' }: SearchFieldProps) {
  return (
    <label className="search-field">
      <span className="sr-only">{label}</span>
      <Search size={15} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}
