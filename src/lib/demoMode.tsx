import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

// علم وضع النموذج — يجعل تتبّعات «اليوم» والقياسات تعمل في الذاكرة فقط (بلا كتابة في localStorage).

const DemoModeContext = createContext<boolean>(false)

export function DemoModeProvider({ children }: { children: ReactNode }) {
  return <DemoModeContext.Provider value={true}>{children}</DemoModeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIsDemo(): boolean {
  return useContext(DemoModeContext)
}
