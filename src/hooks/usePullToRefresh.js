import { useEffect, useRef, useState } from 'react'

function esDispositivoTactil() {
  return window.matchMedia('(pointer: coarse)').matches
}

export function usePullToRefresh({ onRefresh, threshold = 96, holdMs = 120 }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isEnabled, setIsEnabled] = useState(() =>
    typeof window !== 'undefined' ? esDispositivoTactil() : false,
  )
  const pullDistanceRef = useRef(0)

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

    let startY = 0
    let startTime = 0
    let isPulling = false

    const resetPull = () => {
      pullDistanceRef.current = 0
      setPullDistance(0)
    }

    const handleTouchStart = (event) => {
      if (isRefreshing || window.scrollY > 0 || event.touches.length !== 1) {
        return
      }

      startY = event.touches[0].clientY
      startTime = Date.now()
      isPulling = true
    }

    const handleTouchMove = (event) => {
      if (!isPulling || isRefreshing || window.scrollY > 0) {
        return
      }

      const currentY = event.touches[0].clientY
      const delta = currentY - startY

      if (delta <= 0) {
        resetPull()
        return
      }

      const adjustedDistance = Math.min(delta * 0.65, 132)
      pullDistanceRef.current = adjustedDistance
      setPullDistance(adjustedDistance)
      event.preventDefault()
    }

    const handleTouchEnd = () => {
      if (!isPulling) {
        return
      }

      isPulling = false
      const shouldRefresh =
        pullDistanceRef.current >= threshold && Date.now() - startTime >= holdMs

      resetPull()

      if (!shouldRefresh) {
        return
      }

      setIsRefreshing(true)
      Promise.resolve(onRefresh())
        .catch(() => {})
        .finally(() => {
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
    }
  }, [holdMs, isEnabled, isRefreshing, onRefresh, threshold])

  return {
    isEnabled,
    isPulling: pullDistance > 0,
    pullDistance,
    isReady: pullDistance >= threshold,
    isRefreshing,
  }
}
