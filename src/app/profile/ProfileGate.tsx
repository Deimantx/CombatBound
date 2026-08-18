import { AppShell } from "../shell/AppShell";
import { OfflineTimeModal } from "./OfflineTimeModal";
import { ProfileSelectScreen } from "../screens/profile/ProfileSelectScreen";
import { ProfileSessionCoordinator } from "./ProfileSessionCoordinator";
import { useGameStore } from "../../state/gameStore";
import { OfflineSimulationResultsModal } from "../offline/OfflineSimulationResultsModal";

export function ProfileGate() {
  const activeProfileId = useGameStore((state) => state.activeProfileId);
  if (!activeProfileId) return <ProfileSelectScreen />;
  return <><ProfileSessionCoordinator profileId={activeProfileId} /><AppShell /><OfflineTimeModal /><OfflineSimulationResultsModal /></>;
}
