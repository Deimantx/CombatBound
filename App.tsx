import { TooltipProvider } from './src/app/components/tooltip/TooltipProvider'
import { ProfileGate } from './src/app/profile/ProfileGate'

export default function App() {
  return <TooltipProvider><ProfileGate /></TooltipProvider>
}
