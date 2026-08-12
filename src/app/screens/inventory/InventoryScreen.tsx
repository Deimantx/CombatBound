import { ArrowDownUp, Backpack, Filter, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { itemDefinitions } from '../../../game/data/items'
import { useGameStore } from '../../../state/gameStore'
import { Panel } from '../../components/Panel'
import { PlaceholderArt } from '../../components/PlaceholderArt'
import { SearchField } from '../../components/SearchField'
import { SegmentedTabs } from '../../components/SegmentedTabs'
import { StatLine } from '../../components/StatLine'
import { ScreenHeading } from '../../shell/ScreenHeading'

const categories = ['All', 'Weapons', 'Armor', 'Accessories', 'Materials', 'Consumables', 'Currency'] as const
const categoryIds = { Weapons: 'weapon', Armor: 'armor', Accessories: 'accessory', Materials: 'material', Consumables: 'consumable', Currency: 'currency' } as const

export function InventoryScreen() {
  const game = useGameStore((state) => state.game)
  const filter = useGameStore((state) => state.inventoryFilter)
  const setFilter = useGameStore((state) => state.setInventoryFilter)
  const selectedId = useGameStore((state) => state.selectedInventoryItemId)
  const selectItem = useGameStore((state) => state.selectInventoryItem)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'name' | 'quantity'>('name')
  const visibleItems = useMemo(() => itemDefinitions.filter((item) => (game.inventory.quantities[item.id] ?? 0) > 0 && (filter === 'All' || item.category === categoryIds[filter as Exclude<typeof categories[number], 'All'>]) && item.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : (game.inventory.quantities[b.id] ?? 0) - (game.inventory.quantities[a.id] ?? 0)), [filter, query, sort, game.inventory.quantities])
  const selected = itemDefinitions.find((item) => item.id === selectedId) ?? visibleItems[0] ?? itemDefinitions[0]
  const selectedQuantity = game.inventory.quantities[selected.id] ?? 0
  return <div className="screen inventory-screen" data-debug-screen="inventory">
    <ScreenHeading screen="inventory" />
    <Panel title="Inventory toolbar" subtitle="Real gameplay items and combat rewards" icon={Backpack} panelId="inventoryToolbar" screen="inventory" className="inventory-toolbar"><div className="inventory-toolbar-row"><SearchField value={query} onChange={setQuery} placeholder="Search items" /><div className="toolbar-actions"><button className="button button-ghost button-small" onClick={() => setSort(sort === 'name' ? 'quantity' : 'name')}><ArrowDownUp size={14} />Sort: {sort === 'name' ? 'Name' : 'Quantity'}</button><button className="button button-ghost button-small"><Filter size={14} />Filters</button></div></div><SegmentedTabs items={categories} active={filter as typeof categories[number]} onChange={setFilter} label="Inventory categories" /></Panel>
    <div className="inventory-layout"><Panel title="Carried items" subtitle={`${visibleItems.length} item types · combat loot appears here immediately`} icon={Backpack} panelId="inventoryBank" screen="inventory" className="inventory-bank"><div className="capacity-row"><span>Item types</span><strong>{visibleItems.length} <small>/ {itemDefinitions.length}</small></strong></div><div className="capacity-track"><span style={{ width: `${Math.min(100, (visibleItems.length / itemDefinitions.length) * 100)}%` }} /></div><div className="inventory-grid">{visibleItems.map((item) => <button key={item.id} className={`inventory-card rarity-${item.rarity} ${selected?.id === item.id ? 'is-selected' : ''}`} onClick={() => selectItem(item.id)} data-debug-kind="inventory-item" data-debug-target-id={item.id} data-debug-label={item.name}><span className="item-quantity">{game.inventory.quantities[item.id]}</span><PlaceholderArt icon={item.icon} size="medium" variant={item.rarity === 'rare' ? 'gold' : item.rarity === 'uncommon' ? 'blue' : 'muted'} /><strong>{item.name}</strong><small>{item.category} · {item.rarity}</small></button>)}</div></Panel>
      <Panel title="Item details" subtitle="Selected item inspection" icon={SlidersHorizontal} panelId="inventoryDetails" screen="inventory" className="inventory-details"><div className="detail-item-head"><PlaceholderArt icon={selected.icon} label={selected.name} size="large" variant={selected.rarity === 'rare' ? 'gold' : selected.rarity === 'uncommon' ? 'blue' : 'muted'} /><div><span className="tiny-label">{selected.category.toUpperCase()}</span><h3>{selected.name}</h3><p>{selected.rarity} · {selectedQuantity} owned</p></div></div><p className="detail-description">{selected.description}</p>{selected.stats && <div className="detail-stats">{Object.entries(selected.stats).map(([key, value]) => <StatLine key={key} label={key} value={`+${value}`} accent="gold" />)}</div>}<div className="detail-footer"><span>Quantity</span><strong>{selectedQuantity}</strong></div></Panel></div>
  </div>
}
