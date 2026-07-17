'use client'

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import PageLoader from './page-loader'

type LoaderContextType = {
  showLoader: () => void
  hideLoader: () => void
  runLoader: (duration?: number) => void
}

const LoaderContext = createContext<LoaderContextType | null>(null)

export default function GlobalLoaderProvider({
  children,
}: {
  children: ReactNode
}) {
  const firstLoadDone = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loading, setLoading] = useState(true)

  const clearLoaderTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const showLoader = () => {
    clearLoaderTimer()
    setLoading(true)
  }

  const hideLoader = () => {
    clearLoaderTimer()
    setLoading(false)
  }

  const runLoader = (duration = 1400) => {
    clearLoaderTimer()
    setLoading(true)

    timerRef.current = setTimeout(() => {
      setLoading(false)
    }, duration)
  }

  useEffect(() => {
    if (firstLoadDone.current) return

    firstLoadDone.current = true

    timerRef.current = setTimeout(() => {
      setLoading(false)
    }, 1800)

    return () => clearLoaderTimer()
  }, [])

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader, runLoader }}>
      <PageLoader loading={loading} />
      {children}
    </LoaderContext.Provider>
  )
}

export function useLoader() {
  const context = useContext(LoaderContext)

  if (!context) {
    throw new Error('useLoader must be used inside GlobalLoaderProvider')
  }

  return context
}