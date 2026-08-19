import type { DamageType, PlayerActionTargetMode } from "../combat/combatTypes";

export type MagicArtId = "magic-art.earth-shield";

export interface MagicArtDefinition {
  id: MagicArtId;
  name: string;
  description: string;
  icon: string;
  manaCost: number;
  cooldownSeconds: number;
  durationSeconds: number;
  targetMode: PlayerActionTargetMode;
  damage?: {
    damageType: DamageType;
    min: number;
    max: number;
    blockable?: boolean;
    canCrit?: boolean;
  };
  barrier?: {
    effectId: string;
    absorbAmount: number;
  };
}

export interface MagicArtsState {
  knownArtIds: MagicArtId[];
}
