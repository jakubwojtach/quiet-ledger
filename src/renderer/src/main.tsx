import './assets/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { LocaleProvider } from '@renderer/lib/i18n/locale'
import { PreferencesProvider } from '@renderer/lib/preferences'
import { ThemeProvider } from '@renderer/lib/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <PreferencesProvider>
        <LocaleProvider>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </LocaleProvider>
      </PreferencesProvider>
    </ThemeProvider>
  </StrictMode>
)
