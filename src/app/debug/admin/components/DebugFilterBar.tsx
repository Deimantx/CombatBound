export function DebugFilterBar<T extends string>({ values, value, onChange, labels }: { values: readonly T[]; value: T; onChange: (value: T) => void; labels?: Partial<Record<T, string>> }) {
  return <div className="debug-filter-row">{values.map((entry) => <button type="button" key={entry} className={value === entry ? "is-active" : ""} onClick={() => onChange(entry)} data-debug-kind="debug-filter" data-debug-filter={entry}>{labels?.[entry] ?? entry.toUpperCase()}</button>)}</div>;
}
