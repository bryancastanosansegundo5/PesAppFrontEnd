function RefreshIcon({ className = '', style }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

export default function MobilePullToRefreshIndicator({
  isPulling,
  isReady,
  isRefreshing,
  pullDistance,
  progress = 0,
  alwaysVisible = false,
}) {
  const isVisible = alwaysVisible || isPulling || isRefreshing
  const cappedProgress = Math.min(Math.max(progress, 0), 1)
  const translateY = isRefreshing ? 16 : -26 + Math.min(pullDistance * 0.42, 42)
  const scale = isPulling || isRefreshing ? 0.88 + cappedProgress * 0.16 : 0.72
  const rotation = isRefreshing ? 360 : cappedProgress * 220
  const toneClasses =
    isReady || isRefreshing
      ? 'border-neon-cyan/70 bg-slate-950/92 text-neon-cyan dark:bg-[#050a12]/96'
      : 'border-white/10 bg-slate-950/82 text-slate-200 dark:bg-[#050a12]/92'

  return (
    <div
      className="pointer-events-none flex h-0 justify-center overflow-visible sm:hidden"
      aria-hidden={!isVisible}
    >
      <div
        className={`relative -mt-2 flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-xl transition-all duration-200 ease-out ${toneClasses}`}
        style={{
          opacity: isVisible ? 1 : 0,
          translate: `0 ${translateY}px`,
          transform: `scale(${scale})`,
          boxShadow:
            isPulling || isReady || isRefreshing
              ? '0 18px 38px rgb(2 6 23 / 0.34), 0 0 0 5px rgb(0 255 237 / 0.1)'
              : '0 12px 28px rgb(2 6 23 / 0.2)',
        }}
      >
        <div className="absolute inset-0 rounded-full border border-white/10" />
        <div
          className="absolute inset-[3px] rounded-full border border-neon-cyan/15"
          style={{ opacity: 0.45 + cappedProgress * 0.4 }}
        />
        <div
          className="absolute inset-[5px] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgb(0 255 237 / 0.18), transparent 58%)',
            opacity: 0.5 + cappedProgress * 0.3,
          }}
        />
        <div className="relative flex items-center justify-center">
          <RefreshIcon
            className={`h-5 w-5 text-neon-cyan transition-[transform,opacity] ease-out ${
              isRefreshing ? 'duration-700' : 'duration-200'
            }`}
            style={{
              opacity: 0.72 + cappedProgress * 0.28,
              transform: `rotate(${rotation}deg)`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
