import { useEffect, useId, useRef, useState } from 'react'

export type SelectOption = {
  value: string
  label: string
  color?: string
  muted?: boolean
}

type Props = {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}

export function SelectMenu({ value, options, onChange, ariaLabel, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const selected = options[selectedIndex]

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  function choose(nextValue: string) {
    onChange(nextValue)
    setOpen(false)
    button.current?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      setOpen(false)
      button.current?.focus()
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen((current) => !current)
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const direction = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex = (selectedIndex + direction + options.length) % options.length
    if (!open) setOpen(true)
    else choose(options[nextIndex].value)
  }

  return <div className={`select-menu ${className}`} ref={root} onDoubleClick={(event) => event.stopPropagation()}>
    <button ref={button} type="button" className="select-trigger" aria-label={ariaLabel}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={menuId}
      onClick={() => setOpen((current) => !current)} onKeyDown={handleKeyDown}>
      <span>{selected?.color && <i style={{ backgroundColor: selected.color }} />}{selected?.label ?? '선택'}</span>
      <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg>
    </button>
    {open && <div id={menuId} className="select-popover" role="listbox" aria-label={ariaLabel}>
      {options.map((option) => <button type="button" role="option" aria-selected={option.value === value}
        className={option.muted ? 'muted' : ''} onClick={() => choose(option.value)} key={option.value}>
        <span>{option.color && <i style={{ backgroundColor: option.color }} />}{option.label}</span>
        {option.value === value && <b aria-hidden="true">✓</b>}
      </button>)}
    </div>}
  </div>
}
