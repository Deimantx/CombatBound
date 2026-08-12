interface SegmentedTabsProps<T extends string> {
  items: readonly T[]
  active: T
  onChange: (item: T) => void
  label?: string
}

export function SegmentedTabs<T extends string>({ items, active, onChange, label }: SegmentedTabsProps<T>) {
  return (
    <div className="segmented-tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button key={item} className={active === item ? 'tab-button is-active' : 'tab-button'} onClick={() => onChange(item)} role="tab" aria-selected={active === item}>
          {item}
        </button>
      ))}
    </div>
  )
}
