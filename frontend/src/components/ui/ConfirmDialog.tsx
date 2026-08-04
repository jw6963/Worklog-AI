import { useCallback, useEffect, useRef, useState } from 'react'

type ConfirmOptions = {
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  requiredText?: string
}

export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [typed, setTyped] = useState('')
  const resolver = useRef<((value: boolean) => void) | null>(null)
  const confirmButton = useRef<HTMLButtonElement>(null)

  const close = useCallback((result: boolean) => {
    resolver.current?.(result)
    resolver.current = null
    setOptions(null)
    setTyped('')
  }, [])

  const confirm = useCallback((next: ConfirmOptions) => new Promise<boolean>((resolve) => {
    resolver.current?.(false)
    resolver.current = resolve
    setTyped('')
    setOptions(next)
  }), [])

  useEffect(() => {
    if (!options) return
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(false) }
    document.addEventListener('keydown', keydown)
    window.setTimeout(() => confirmButton.current?.focus())
    return () => document.removeEventListener('keydown', keydown)
  }, [close, options])

  useEffect(() => () => resolver.current?.(false), [])

  const dialog = options && <div className="confirm-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) close(false) }}>
    <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
      <span className={options.danger ? 'danger' : ''}>{options.danger ? '주의가 필요한 작업' : '작업 확인'}</span>
      <h2 id="confirm-title">{options.title}</h2>
      <p id="confirm-description">{options.description}</p>
      {options.requiredText && <label><span>계속하려면 <strong>{options.requiredText}</strong> 입력</span><input value={typed} maxLength={50} onChange={(event) => setTyped(event.target.value)} /></label>}
      <div><button type="button" onClick={() => close(false)}>취소</button><button ref={confirmButton} type="button" className={options.danger ? 'danger' : 'primary'} disabled={!!options.requiredText && typed !== options.requiredText} onClick={() => close(true)}>{options.confirmLabel ?? '확인'}</button></div>
    </div>
  </div>

  return { confirm, dialog }
}
