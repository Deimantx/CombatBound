import { ArrowDownUp, Backpack, Filter, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { itemDefinitions } from '../../../game/data/items'
import { getStackableQuantity, getItemInstances } from '../../../game/items/itemOwnership'
import { resolveItemInstance } from '../../../game/items/itemResolver'
import type { InventoryEntryRef } from '../../../game/items/itemTypes'
import { formatItemStats } from '../../../game/presentation/statFormatting'
import { buildItemInstanceTooltip, buildItemTooltip } from '../../../game/presentation/tooltipBuilders'
import { useGameStore } from '../../../state/gameStore'
import { Panel } from '../../components/Panel'
import { PlaceholderArt } from '../../components/PlaceholderArt'
import { GameTooltip } from '../../components/tooltip/GameTooltip'
import { SearchField } from '../../components/SearchField'
import { SegmentedTabs } from '../../components/SegmentedTabs'
import { StatLine } from '../../components/StatLine'
import { ScreenHeading } from '../../shell/ScreenHeading'

const categories = ['All', 'Weapons', 'Armor', 'Accessories', 'Materials', 'Consumables', 'Currency'] as const
const categoryIds = { Weapons: 'weapon', Armor: 'armor', Accessories: 'accessory', Materials: 'material', Consumables: 'consumable', Currency: 'currency' } as const

type InventoryViewEntry = {
  ref: InventoryEntryRef
  definition: (typeof itemDefinitions)[number]
  quantity: number
  instanceId?: string
  equipped: boolean
}

function inventoryRefsEqual(left: InventoryEntryRef | null | undefined, right: InventoryEntryRef | null | undefined) {
  if (!left || !right || left.kind !== right.kind) return false
  if (left.kind === 'stack' && right.kind === 'stack') return left.definitionId === right.definitionId
  if (left.kind === 'instance' && right.kind === 'instance') return left.instanceId === right.instanceId
  return false
}

export function InventoryScreen() {
  const game = useGameStore((state) => state.game)
  const filter = useGameStore((state) => state.inventoryFilter)
  const setFilter = useGameStore((state) => state.setInventoryFilter)
  const selectedEntry = useGameStore((state) => state.selectedInventoryEntry)
  const selectEntry = useGameStore((state) => state.selectInventoryEntry)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'name' | 'quantity'>('name')
  const entries = useMemo<InventoryViewEntry[]>(() => {
    const result: InventoryViewEntry[] = []
    for (const definition of itemDefinitions) {
      if (filter !== 'All' && definition.category !== categoryIds[filter as Exclude<typeof categories[number], 'All'>]) continue
      if (!definition.name.toLowerCase().includes(query.toLowerCase())) continue
      if (definition.inventoryMode === 'stackable') {
        const quantity = getStackableQuantity(game.inventory, definition.id)
        if (quantity > 0) result.push({ ref: { kind: 'stack', definitionId: definition.id }, definition, quantity, equipped: false })
      }
    }
    for (const instance of getItemInstances(game.inventory)) {
      const resolved = resolveItemInstance(game.inventory, instance.id)
      if (!resolved) continue
      if (filter !== 'All' && resolved.definition.category !== categoryIds[filter as Exclude<typeof categories[number], 'All'>]) continue
      if (!resolved.definition.name.toLowerCase().includes(query.toLowerCase())) continue
      result.push({ ref: { kind: 'instance', instanceId: instance.id }, definition: resolved.definition, quantity: 1, instanceId: instance.id, equipped: Object.values(game.equipment.slots).includes(instance.id) })
    }
    return result.sort((a, b) => sort === 'name'
      ? a.definition.name.localeCompare(b.definition.name) || (a.instanceId ?? '').localeCompare(b.instanceId ?? '')
      : b.quantity - a.quantity || a.definition.name.localeCompare(b.definition.name) || (a.instanceId ?? '').localeCompare(b.instanceId ?? ''))
  }, [filter, query, sort, game.inventory, game.equipment.slots])
  const selected = entries.find((entry) => inventoryRefsEqual(entry.ref, selectedEntry)) ?? entries[0]
  const selectedResolved = selected?.instanceId ? resolveItemInstance(game.inventory, selected.instanceId) : undefined
  const selectedTooltip = selectedResolved ? buildItemInstanceTooltip(selectedResolved, { equipped: selected.equipped }) : selected ? buildItemTooltip(selected.definition, { quantity: selected.quantity }) : undefined
  const selectedStats = selectedResolved?.effectiveStats ?? selected?.definition.stats

  return <div className="screen inventory-screen" data-debug-screen="inventory">
    <ScreenHeading screen="inventory" />
    <Panel title="Inventory toolbar" subtitle="Real gameplay items and combat rewards" icon={Backpack} panelId="inventoryToolbar" screen="inventory" className="inventory-toolbar"><div className="inventory-toolbar-row"><SearchField value={query} onChange={setQuery} placeholder="Search items" /><div className="toolbar-actions"><button className="button button-ghost button-small" onClick={() => setSort(sort === 'name' ? 'quantity' : 'name')}><ArrowDownUp size={14} />Sort: {sort === 'name' ? 'Name' : 'Quantity'}</button><button className="button button-ghost button-small"><Filter size={14} />Filters</button></div></div><SegmentedTabs items={categories} active={filter as typeof categories[number]} onChange={setFilter} label="Inventory categories" /></Panel>
    <div className="inventory-layout"><Panel title="Carried items" subtitle={`${entries.length} owned entries · combat loot appears here immediately`} icon={Backpack} panelId="inventoryBank" screen="inventory" className="inventory-bank"><div className="capacity-row"><span>Owned entries</span><strong>{entries.length} <small>/ {itemDefinitions.length}</small></strong></div><div className="capacity-track"><span style={{ width: `${Math.min(100, (entries.length / itemDefinitions.length) * 100)}%` }} /></div><div className="inventory-grid">{entries.map((entry) => <GameTooltip key={entry.instanceId ?? entry.definition.id} content={entry.instanceId ? buildItemInstanceTooltip(resolveItemInstance(game.inventory, entry.instanceId)!, { equipped: entry.equipped }) : buildItemTooltip(entry.definition, { quantity: entry.quantity })}><button className={`inventory-card rarity-${entry.definition.rarity} ${selected?.ref === entry.ref ? 'is-selected' : ''}`} onClick={() => selectEntry(entry.ref)} data-debug-kind="inventory-item" data-debug-target-id={entry.instanceId ?? entry.definition.id} data-debug-item-id={entry.definition.id} data-debug-instance-id={entry.instanceId} data-debug-label={entry.definition.name}><span className="item-quantity">{entry.instanceId ? '' : entry.quantity}</span><PlaceholderArt icon={entry.definition.icon} size="medium" variant={entry.definition.rarity === 'rare' ? 'gold' : entry.definition.rarity === 'uncommon' ? 'blue' : 'muted'} /><strong>{entry.definition.name}</strong><small>{entry.definition.category} · {entry.equipped ? 'Equipped' : entry.definition.rarity}</small></button></GameTooltip>)}</div></Panel>
      <Panel title="Item details" subtitle="Selected item inspection" icon={SlidersHorizontal} panelId="inventoryDetails" screen="inventory" className="inventory-details">{selected && selectedTooltip ? <><GameTooltip content={selectedTooltip}><div className="detail-item-head" data-debug-kind="tooltip-trigger" data-debug-item-id={selected.definition.id} data-debug-instance-id={selected.instanceId}><PlaceholderArt icon={selected.definition.icon} label={selected.definition.name} size="large" variant={selected.definition.rarity === 'rare' ? 'gold' : selected.definition.rarity === 'uncommon' ? 'blue' : 'muted'} /><div><span className="tiny-label">{selected.definition.category.toUpperCase()}</span><h3>{selected.definition.name}</h3><p>{selected.definition.rarity} · {selected.instanceId ? (selected.equipped ? 'Equipped instance' : 'Owned instance') : `${selected.quantity} owned`}</p></div></div></GameTooltip><p className="detail-description">{selected.definition.description}</p>{selectedStats && <div className="detail-stats">{formatItemStats(selectedStats).map((stat) => <StatLine key={stat.label} label={stat.label} value={stat.value} accent="gold" />)}</div>}<div className="detail-footer"><span>{selected.instanceId ? 'Instance' : 'Quantity'}</span><strong>{selected.instanceId ? '1' : selected.quantity}</strong></div></> : <p className="detail-description">No owned item selected.</p>}</Panel></div>
  </div>
}
