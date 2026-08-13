import { AppShell } from './src/app/shell/AppShell'
import { TooltipProvider } from './src/app/components/tooltip/TooltipProvider'

export default function App() {
  return <TooltipProvider><AppShell /></TooltipProvider>
}
