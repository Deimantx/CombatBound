import { ArrowRight, Check, ChevronDown, Shield, ShieldCheck, Sparkles, Sword, Swords } from 'lucide-react'
import { useId, useState } from 'react'
import { itemDefinitions, type ItemDefinition } from '../../../game/data/items'
import { proficiencyById } from '../../../game/data/proficiencies'
import { getEquippedWeaponProficiency } from '../../../game/progression/progressionSelectors'
import { getProficiencyLevel } from '../../../game/progression/proficiencyProgression'
import { calculateHunterCombatStats } from '../../../game/equipment/derivedStats'
import { calculateArmorMitigation } from '../../../game/combat/combatMath'
import type { CombatReferenceCategory } from '../../../game/data/combatGlossary'
import { formatCombatStatValue, formatItemStats, formatPercent, labelForStatKey } from '../../../game/presentation/statFormatting'
import { buildItemTooltip } from '../../../game/presentation/tooltipBuilders'
import { useGameStore } from '../../../state/gameStore'
import { CollapsiblePanel } from '../../components/CollapsiblePanel'
import { GameTooltip } from '../../components/tooltip/GameTooltip'
import { Panel } from '../../components/Panel'
import { PlaceholderArt } from '../../components/PlaceholderArt'
import { StatLine } from '../../components/StatLine'
import { ScreenHeading } from '../../shell/ScreenHeading'

const statGroups: Array<{ id: CombatReferenceCategory; title: string; keys: string[] }> = [
  { id: 'offense', title: 'OFFENSE', keys: ['attackPower', 'accuracy', 'attackInterval', 'critChance', 'critDamage'] },
  { id: 'defense', title: 'DEFENSE', keys: ['maxHealth', 'armor', 'evasion', 'dodgeChance', 'parryChance', 'blockChance', 'blockPower', 'statusResistance'] },
  { id: 'resources', title: 'RESOURCES', keys: ['maxStamina', 'staminaRegen', 'maxMana', 'manaRegen'] },
  { id: 'resistances', title: 'RESISTANCES', keys: ['physicalResistance', 'fireResistance', 'waterResistance', 'airResistance', 'earthResistance', 'lightResistance', 'darknessResistance', 'natureResistance', 'mysticResistance'] },
]

const EQUIPMENT_STAT_GROUPS_STORAGE_KEY = 'combatbound-equipment-stat-groups'
type EquipmentStatGroupId = (typeof statGroups)[number]['id']
type EquipmentStatGroupState = Partial<Record<EquipmentStatGroupId, boolean>>

function readEquipmentStatGroupState(): EquipmentStatGroupState {
  try {
    const saved = window.localStorage.getItem(EQUIPMENT_STAT_GROUPS_STORAGE_KEY)
    return saved ? JSON.parse(saved) as EquipmentStatGroupState : {}
  } catch {
    return {}
  }
}

function persistEquipmentStatGroupState(id: EquipmentStatGroupId, open: boolean) {
  try {
    window.localStorage.setItem(EQUIPMENT_STAT_GROUPS_STORAGE_KEY, JSON.stringify({ ...readEquipmentStatGroupState(), [id]: open }))
  } catch {
    // Storage is optional; the component state still works for the current mount.
  }
}

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
  const equippedProficiency = getEquippedWeaponProficiency(game.equipment)
  const equippedProficiencyName = equippedProficiency ? proficiencyById[equippedProficiency]?.name : undefined
  const equippedProficiencyLevel = equippedProficiency ? getProficiencyLevel(game.progression, equippedProficiency) : 0
  const resistance = (key: string) => stats.resistances[key.replace('Resistance', '').toLowerCase() as keyof typeof stats.resistances] ?? 0
  const valueFor = (key: string) => key.endsWith('Resistance') ? resistance(key) : stats[key as keyof typeof stats] as number
  const detailFor = (key: string) => key === 'armor' ? `${formatCombatStatValue(key, valueFor(key))} · ${formatPercent(calculateArmorMitigation(stats.armor))} Physical direct mitigation` : key === 'attackInterval' ? `${formatCombatStatValue(key, valueFor(key))} · ${(1 / stats.attackInterval).toFixed(2)} attacks/sec` : undefined

  return <div className="screen equipment-screen" data-debug-screen="equipment">
    <ScreenHeading screen="equipment" />
    <div className="equipment-layout">
      <Panel title="Equipment loadout" subtitle={combatLocked ? 'Viewing is allowed · Stop combat to change equipment.' : 'Combat-only equipment slots'} icon={ShieldCheck} panelId="equipmentLoadout" screen="equipment" className="equipment-loadout">
        <div className="loadout-topline"><div className="loadout-avatar"><Shield size={32} /></div><div><h3>Vanguard</h3><p>{equippedProficiencyName ? `${equippedProficiencyName} · Lv ${equippedProficiencyLevel}` : 'No weapon proficiency'} · {stats.attackPower} Attack Power</p></div><span className="loadout-rating"><Sparkles size={14} /> {stats.maxHealth} Max HP</span></div>
        <div className="equipment-slots">{(['weapon', 'armor'] as const).map((slot) => { const item = itemDefinitions.find((candidate) => candidate.id === game.equipment.slots[slot]); const active = selected === slot; return <GameTooltip key={slot} content={item ? buildItemTooltip(item, { equipped: true, quantity: game.inventory.quantities[item.id] ?? 0 }) : { id: `equipment-slot.${slot}`, title: `${slot[0].toUpperCase()}${slot.slice(1)} slot`, description: 'An equipment slot for the Hunter.' }}><button className={`equipment-slot ${active ? 'is-selected' : ''}`} onClick={() => selectSlot(slot)} data-debug-kind="equipment-slot" data-debug-item-id={item?.id} data-debug-label={slot}><span className="slot-label">{slot}</span><PlaceholderArt icon={item?.icon ?? 'shield'} size="medium" variant={active ? 'gold' : 'muted'} /><strong>{item?.name ?? 'Empty'}</strong><small>{active ? 'Selected' : item?.rarity ?? 'Empty'}</small>{active && <span className="selected-check"><Check size={12} /></span>}</button></GameTooltip> })}</div>
        <div className="loadout-total"><span>Total combat rating</span><strong>{stats.attackPower}</strong><span className="text-green">{combatLocked ? 'Locked during combat' : 'Ready to equip'}</span></div>
      </Panel>

      <CollapsiblePanel title="Hunter Combat Stats" subtitle="All derived values used by live combat" icon={Swords} panelId="equipmentStats" screen="equipment" className="equipment-stats" summary={<><span>Attack Power {stats.attackPower}</span><span>Armor {Math.round(stats.armor)}</span><span>Accuracy {Math.round(stats.accuracy)}</span><span>Max Health {Math.round(stats.maxHealth)}</span></>}>
        <div className="equipment-stat-groups">{statGroups.map((group) => <EquipmentStatGroup key={group.id} group={group} valueFor={valueFor} detailFor={detailFor} />)}</div>
        <div className="stat-tip"><Sparkles size={14} /><span>Preparation matters<br /><small>Temporary combat effects are shown on the Combat screen.</small></span></div>
      </CollapsiblePanel>

      <Panel title="Compatible items" subtitle={`Owned ${selected} candidates`} icon={Sword} panelId="equipmentCandidates" screen="equipment" actions={<span className="target-count">{candidates.length} owned</span>}>
        <div className="candidate-list">{candidates.map((item) => <CandidateItem key={item.id} item={item} equipped={item.id === equippedId} locked={combatLocked} onEquip={() => equipItem(item.id, selected)} quantity={game.inventory.quantities[item.id] ?? 0} />)}</div>
        <div className="comparison-box"><span className="tiny-label">COMPARISON</span><div><span>Equipped</span><strong>{equipped.name}</strong><em>{formatItemStats(equipped.stats ?? {}).map((stat) => `${stat.label} ${stat.value}`).join(' · ') || 'No combat stats'}</em></div><ArrowRight size={15} /><div className="comparison-placeholder"><span>{combatLocked ? 'Equipment locked' : 'Select an item above'}</span><small>{combatLocked ? 'Stop combat before equipping.' : 'Click a candidate to equip it.'}</small></div></div>
      </Panel>
    </div>
  </div>
}

function EquipmentStatGroup({ group, valueFor, detailFor }: { group: typeof statGroups[number]; valueFor: (key: string) => number; detailFor: (key: string) => string | undefined }) {
  const [open, setOpen] = useState(() => readEquipmentStatGroupState()[group.id] ?? true)
  const generatedId = useId().replace(/:/g, '')
  const contentId = `equipment-stat-group-${group.id}-${generatedId}`
  return <section className={`equipment-stat-group ${open ? 'is-open' : 'is-collapsed'}`} data-debug-panel-section={group.id}>
    <button type="button" className="equipment-stat-group-toggle" onClick={() => setOpen((value) => { const next = !value; persistEquipmentStatGroupState(group.id, next); return next })} aria-expanded={open} aria-controls={contentId} data-debug-kind="collapsible-stat-group" data-debug-panel-section={group.id} data-debug-label={group.title}>
      <h3>{group.title}</h3><ChevronDown size={16} className={`equipment-stat-group-chevron ${open ? 'is-open' : ''}`} aria-hidden="true" />
    </button>
    <div id={contentId} className="equipment-stat-group-content" hidden={!open} aria-hidden={!open}>
      <div className={group.id === 'resistances' ? 'equipment-resistance-grid' : 'stat-stack'}>{group.keys.map((key) => { const value = valueFor(key); return <StatLine key={key} label={labelForStatKey(key)} value={formatCombatStatValue(key, value)} detail={detailFor(key)} accent={key.endsWith('Resistance') ? value > 0 ? 'green' : value < 0 ? 'red' : undefined : key === 'attackPower' ? 'gold' : undefined} statKey={key} statValue={value} /> })}</div>
    </div>
  </section>
}

function CandidateItem({ item, equipped, locked, onEquip, quantity }: { item: ItemDefinition; equipped: boolean; locked: boolean; onEquip: () => void; quantity: number }) {
  const button = <button className={`candidate-item ${equipped ? 'is-equipped' : ''}`} onClick={onEquip} disabled={locked} data-debug-kind="equipment-candidate" data-debug-target-id={item.id} data-debug-item-id={item.id} data-debug-label={item.name}><PlaceholderArt icon={item.icon} size="small" variant={item.rarity === 'rare' ? 'gold' : item.rarity === 'uncommon' ? 'blue' : 'muted'} /><span><strong>{item.name}</strong><small>{formatItemStats(item.stats ?? {}).map((stat) => `${stat.label} ${stat.value}`).join(' · ') || item.description}</small></span>{equipped ? <span className="equipped-label"><Check size={13} /> Equipped</span> : <ArrowRight size={15} />}</button>
  return locked ? <GameTooltip content={buildItemTooltip(item, { quantity, equipped })}><span className="candidate-tooltip-host">{button}</span></GameTooltip> : <GameTooltip content={buildItemTooltip(item, { quantity, equipped })}>{button}</GameTooltip>
}
