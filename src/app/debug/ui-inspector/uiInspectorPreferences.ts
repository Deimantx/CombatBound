const PREFERENCE_KEY = 'combatbound-idle-ui-inspector-preferences'

interface InspectorPreferences { showButton: boolean }

export function readInspectorPreferences(): InspectorPreferences {
  try {
    const raw = localStorage.getItem(PREFERENCE_KEY)
    if (!raw) return { showButton: true }
    const value = JSON.parse(raw) as Partial<InspectorPreferences>
    return { showButton: value.showButton !== false }
  } catch {
    return { showButton: true }
  }
}

export function writeInspectorPreferences(preferences: InspectorPreferences) {
  localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences))
}
