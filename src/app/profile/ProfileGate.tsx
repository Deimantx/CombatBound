import { AppShell } from "../shell/AppShell";
import { OfflineTimeModal } from "./OfflineTimeModal";
import { ProfileSelectScreen } from "../screens/profile/ProfileSelectScreen";
import { ProfileSessionHeartbeat } from "./ProfileSessionHeartbeat";
import { useGameStore } from "../../state/gameStore";

export function ProfileGate() {
  const activeProfileId = useGameStore((state) => state.activeProfileId);
  if (!activeProfileId) return <ProfileSelectScreen />;
  return <><ProfileSessionHeartbeat profileId={activeProfileId} /><AppShell /><OfflineTimeModal /></>;
}
