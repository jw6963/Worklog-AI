import { useEffect, useState } from 'react'

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 420)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  if (!visible) return null
  return <button className="scroll-to-top" type="button" aria-label="맨 위로 이동"
    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
    <span aria-hidden="true">↑</span><small>맨 위로</small>
  </button>
}
