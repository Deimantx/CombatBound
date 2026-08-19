/** Magic Arts earns one XP for each real resource point or HP point credited. */
export function calculateMagicArtsXp(manaSpent: number, effectiveHpDamage = 0): number {
  const mana = Number.isFinite(manaSpent) ? Math.max(0, manaSpent) : 0;
  const damage = Number.isFinite(effectiveHpDamage) ? Math.max(0, effectiveHpDamage) : 0;
  return mana + damage;
}
