import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { CustomizationProvider } from './lib/customizationContext'
import { AuthProvider } from './lib/authContext'
import './styles/index.css'

const root = document.getElementById('root')
if (!root) throw new Error('عنصر root غير موجود في index.html')

createRoot(root).render(
  <StrictMode>
    <AuthProvider>
      <CustomizationProvider>
        <App />
      </CustomizationProvider>
    </AuthProvider>
  </StrictMode>,
)
