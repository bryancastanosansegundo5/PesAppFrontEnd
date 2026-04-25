import { useEffect, useRef, useState } from 'react'

function esDispositivoTactil() {
  return window.matchMedia('(pointer: coarse)').matches
}

function obtenerScrollTop() {
  return Math.max(
    window.scrollY || 0,
    document.documentElement?.scrollTop || 0,
    document.body?.scrollTop || 0,
  )
}

function estaCercaDelInicio() {
  return obtenerScrollTop() <= 4
}

function forzarRecargaPagina() {
  window.location.reload()

  window.setTimeout(() => {
    window.location.replace(window.location.href)
  }, 220)
}

export function usePullToRefresh({
  onRefresh,
  threshold = 96,
  holdMs = 120,
  forceReload = false,
}) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isEnabled, setIsEnabled] = useState(() =>
    typeof window !== 'undefined' ? esDispositivoTactil() : false,
  )
  const pullDistanceRef = useRef(0)
  const isRefreshingRef = useRef(false)
  const isPullingRef = useRef(false)
  const startYRef = useRef(0)
  const startTimeRef = useRef(0)
  const reloadTimeoutRef = useRef(0)
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    const updateEnabled = () => setIsEnabled(mediaQuery.matches)

    mediaQuery.addEventListener('change', updateEnabled)
    return () => mediaQuery.removeEventListener('change', updateEnabled)
  }, [])

  useEffect(() => {
    if (!isEnabled) {
      return undefined
    }

    const resetPull = () => {
      isPullingRef.current = false
      pullDistanceRef.current = 0
      setPullDistance(0)
    }

    const handleTouchStart = (event) => {
      if (isRefreshingRef.current || !estaCercaDelInicio() || event.touches.length !== 1) {
        isPullingRef.current = false
        return
      }

      startYRef.current = event.touches[0].clientY
      startTimeRef.current = Date.now()
      isPullingRef.current = true
    }

    const handleTouchMove = (event) => {
      if (!isPullingRef.current || isRefreshingRef.current || !estaCercaDelInicio()) {
        return
      }

      const currentY = event.touches[0].clientY
      const delta = currentY - startYRef.current

      if (delta <= 0) {
        resetPull()
        return
      }

      const adjustedDistance = Math.min(delta * 0.65, 132)
      pullDistanceRef.current = adjustedDistance
      setPullDistance(adjustedDistance)
      if (event.cancelable) {
        event.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      if (!isPullingRef.current) {
        return
      }

      const shouldRefresh =
        pullDistanceRef.current >= threshold && Date.now() - startTimeRef.current >= holdMs

      resetPull()

      if (!shouldRefresh) {
        return
      }

      isRefreshingRef.current = true
      setIsRefreshing(true)

      if (forceReload) {
        reloadTimeoutRef.current = window.setTimeout(() => {
          forzarRecargaPagina()
        }, 60)

        return
      }

      Promise.resolve(onRefreshRef.current?.())
        .catch(() => {})
        .finally(() => {
          isRefreshingRef.current = false
          setIsRefreshing(false)
        })
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
      window.clearTimeout(reloadTimeoutRef.current)
    }
  }, [forceReload, holdMs, isEnabled, threshold])

  return {
    isEnabled,
    isPulling: pullDistance > 0,
    pullDistance,
    progress: Math.min(pullDistance / threshold, 1),
    threshold,
    isReady: pullDistance >= threshold,
    isRefreshing,
  }
}
