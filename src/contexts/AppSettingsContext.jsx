import { createContext, useContext, useState, useEffect } from 'react'
import { getGoogleMapsKeyFromSettings } from '../api'
import { isGoogleMapsKeyValid } from '../utils/googleMapsKey'

const fallbackKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

const AppSettingsContext = createContext({
  googleMapsApiKey: fallbackKey,
  setGoogleMapsApiKey: () => {},
  settingsLoaded: false,
})

export function AppSettingsProvider({ children }) {
  const [googleMapsApiKey, setGoogleMapsApiKeyState] = useState(fallbackKey)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    getGoogleMapsKeyFromSettings()
      .then((key) => {
        const k = key && typeof key === 'string' ? key.trim() : ''
        if (k && isGoogleMapsKeyValid(k)) setGoogleMapsApiKeyState(k)
      })
      .catch(() => {})
      .finally(() => setSettingsLoaded(true))
  }, [])

  const setGoogleMapsApiKey = (key) => {
    setGoogleMapsApiKeyState(key || fallbackKey)
  }

  const value = {
    googleMapsApiKey: googleMapsApiKey || fallbackKey,
    setGoogleMapsApiKey,
    settingsLoaded,
  }

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useGoogleMapsApiKey() {
  const ctx = useContext(AppSettingsContext)
  return ctx?.googleMapsApiKey ?? fallbackKey
}

export function useAppSettings() {
  return useContext(AppSettingsContext)
}
