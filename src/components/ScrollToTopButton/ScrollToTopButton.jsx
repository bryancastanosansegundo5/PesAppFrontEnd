import { useEffect, useState } from 'react'

function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setIsVisible(window.scrollY > 280)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!isVisible) return null

  return (
    <button
      className="fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-neon-cyan/55 bg-white/80 text-neon-purple shadow-[0_0_24px_rgba(0,255,237,0.28)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-neon-pink hover:text-neon-pink hover:shadow-[0_0_30px_rgba(255,102,255,0.32)] dark:bg-[#090C16]/80 dark:text-neon-cyan"
      type="button"
      aria-label="Subir arriba"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  )
}

export default ScrollToTopButton
