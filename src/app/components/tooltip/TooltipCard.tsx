import { PlaceholderArt } from '../PlaceholderArt'
import type { TooltipModel, TooltipTone } from './tooltipTypes'

export function TooltipCard({ model }: { model: TooltipModel }) {
  return <article className={`game-tooltip tone-${model.tone ?? 'default'}`} role="tooltip" data-debug-kind="game-tooltip" data-debug-tooltip-content={model.id}>
    <header className="game-tooltip-header">
      {model.icon && <PlaceholderArt icon={model.icon} size="small" variant={model.tone === 'gold' ? 'gold' : model.tone === 'red' ? 'red' : model.tone === 'blue' ? 'blue' : 'muted'} />}
      <div><strong className="game-tooltip-title">{model.title}</strong>{model.subtitle && <span className="game-tooltip-subtitle">{model.subtitle}</span>}</div>
    </header>
    {model.description && <p className="game-tooltip-description">{model.description}</p>}
    {model.rows && model.rows.length > 0 && <div className="game-tooltip-rows">{model.rows.map((row, index) => <div className="game-tooltip-row" key={`${row.label}-${index}`}><span className="game-tooltip-label">{row.label}</span><strong className={`game-tooltip-value tone-${row.tone ?? 'default'}`}>{row.value}</strong></div>)}</div>}
    {model.notes && model.notes.length > 0 && <div className="game-tooltip-notes">{model.notes.map((note, index) => <p className="game-tooltip-note" key={`${note}-${index}`}>{note}</p>)}</div>}
  </article>
}

export type { TooltipTone }
