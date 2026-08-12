import { ArrowRight, Check, Shield, ShieldCheck, Sparkles, Sword, Swords } from 'lucide-react'
import { itemDefinitions } from '../../../game/data/items'
import { calculateHunterCombatStats } from '../../../game/equipment/derivedStats'
import { useGameStore } from '../../../state/gameStore'
import { Panel } from '../../components/Panel'
import { PlaceholderArt } from '../../components/PlaceholderArt'
import { StatLine } from '../../components/StatLine'
import { ScreenHeading } from '../../shell/ScreenHeading'

export function EquipmentScreen() {
  const game = useGameStore((state) => state.game)
  const selectedSlot = useGameStore((state) => state.selectedEquipmentSlot)
  const selectSlot = useGameStore((state) => state.selectEquipmentSlot)
  const equipItem = useGameStore((state) => state.equipItem)
  const selected = selectedSlot === 'armor' ? 'armor' : 'weapon'
  const combatLocked = game.combat.phase === 'active' || game.combat.phase === 'recovery'
  const equippedId = game.equipment.slots[selected]
  const equipped = itemDefinitions.find((item) => item.id === equippedId) ?? itemDefinitions[0]
  const candidates = itemDefinitions.filter((item) => item.category === selected && (game.inventory.quantities[item.id] ?? 0) > 0)
  const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques)
  return <div className="screen equipment-screen" data-debug-screen="equipment">
    <ScreenHeading screen="equipment" />
    <div className="equipment-layout">
      <Panel title="Equipment loadout" subtitle={combatLocked ? 'Viewing is allowed · Stop combat to change equipment.' : 'Combat-only equipment slots'} icon={ShieldCheck} panelId="equipmentLoadout" screen="equipment" className="equipment-loadout"><div className="loadout-topline"><div className="loadout-avatar"><Shield size={32} /></div><div><h3>Vanguard</h3><p>Hunter Rank {game.progression.hunterRank} · {stats.attack} Attack</p></div><span className="loadout-rating"><Sparkles size={14} /> {stats.maxHealth} Max HP</span></div><div className="equipment-slots">{(['weapon', 'armor'] as const).map((slot) => { const item = itemDefinitions.find((candidate) => candidate.id === game.equipment.slots[slot]); const active = selected === slot; return <button key={slot} className={`equipment-slot ${active ? 'is-selected' : ''}`} onClick={() => selectSlot(slot)} data-debug-kind="equipment-slot" data-debug-label={slot}><span className="slot-label">{slot}</span><PlaceholderArt icon={item?.icon ?? 'shield'} size="medium" variant={active ? 'gold' : 'muted'} /><strong>{item?.name ?? 'Empty'}</strong><small>{active ? 'Selected' : item?.rarity ?? 'Empty'}</small>{active && <span className="selected-check"><Check size={12} /></span>}</button> })}</div><div className="loadout-total"><span>Total combat rating</span><strong>{stats.attack}</strong><span className="text-green">{combatLocked ? 'Locked during combat' : 'Ready to equip'}</span></div></Panel>
      <Panel title="Combat stats" subtitle="The same derived values used by combat" icon={Swords} panelId="equipmentStats" screen="equipment" className="equipment-stats"><div className="stat-highlight"><div><span>Attack</span><strong>{stats.attack}</strong></div><div><span>Defense</span><strong>{stats.defense}</strong></div></div><div className="stat-stack"><StatLine label="Max HP" value={stats.maxHealth} /><StatLine label="Accuracy" value={stats.accuracy} /><StatLine label="Attack interval" value={`${stats.attackInterval.toFixed(1)}s`} /><StatLine label="Crit chance" value={`${Math.round(stats.critChance * 100)}%`} /></div><div className="stat-tip"><Sparkles size={14} /><span>Preparation matters<br /><small>Equipment changes update these shared combat stats.</small></span></div></Panel>
      <Panel title="Compatible items" subtitle={`Owned ${selected} candidates`} icon={Sword} panelId="equipmentCandidates" screen="equipment" actions={<span className="target-count">{candidates.length} owned</span>}><div className="candidate-list">{candidates.map((item) => <button className={`candidate-item ${item.id === equippedId ? 'is-equipped' : ''}`} key={item.id} onClick={() => equipItem(item.id, selected)} disabled={combatLocked} data-debug-kind="equipment-candidate" data-debug-target-id={item.id} data-debug-label={item.name}><PlaceholderArt icon={item.icon} size="small" variant={item.rarity === 'rare' ? 'gold' : item.rarity === 'uncommon' ? 'blue' : 'muted'} /><span><strong>{item.name}</strong><small>{item.rarity} · {Object.entries(item.stats ?? {}).map(([key, value]) => `+${value} ${key}`).join(' · ')}</small></span>{item.id === equippedId ? <span className="equipped-label"><Check size={13} /> Equipped</span> : <ArrowRight size={15} />}</button>)}</div><div className="comparison-box"><span className="tiny-label">COMPARISON</span><div><span>Equipped</span><strong>{equipped.name}</strong><em>{Object.entries(equipped.stats ?? {}).map(([key, value]) => `+${value} ${key}`).join(' · ')}</em></div><ArrowRight size={15} /><div className="comparison-placeholder"><span>{combatLocked ? 'Equipment locked' : 'Select an item above'}</span><small>{combatLocked ? 'Stop combat before equipping.' : 'Click a candidate to equip it.'}</small></div></div></Panel>
    </div>
  </div>
}
