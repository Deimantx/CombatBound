import type { ScreenId } from '../../shared/types'
import { screenTitles } from '../navigation'

export function ScreenHeading({ screen }: { screen: ScreenId }) {
  const copy = screenTitles[screen]
  return <div className="screen-heading" data-debug-kind="screen-heading" data-debug-label={copy.title}><div><p className="eyebrow">COMBATBOUND IDLE / PROTOTYPE</p><h1>{copy.title}</h1><p>{copy.subtitle}</p></div></div>
}
