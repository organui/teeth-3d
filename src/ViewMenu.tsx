import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { View } from './anatomy'

const views: View[] = ['Anterior', 'Right lateral', 'Posterior']

export default function ViewMenu({
  view,
  disabled,
  onChange,
}: {
  view: View | 'Custom view'
  disabled: boolean
  onChange: (view: View) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()
  const open = expanded && !disabled

  useLayoutEffect(() => {
    if (open) items.current[activeIndex]?.focus({ preventScroll: true })
  }, [open, activeIndex])

  useEffect(() => {
    if (disabled) setExpanded(false)
  }, [disabled])

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setExpanded(false)
      }
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  function show(
    index = Math.max(
      0,
      views.findIndex((v) => v === view),
    ),
  ) {
    setActiveIndex(index)
    setExpanded(true)
  }

  function close() {
    setExpanded(false)
    trigger.current?.focus({ preventScroll: true })
  }

  return (
    <div
      ref={root}
      className="view-selector"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false)
      }}
    >
      <button
        ref={trigger}
        className="view-trigger"
        disabled={disabled}
        aria-label={`Camera view: ${view}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            show(event.key === 'ArrowUp' ? views.length - 1 : undefined)
          }
        }}
      >
        {view}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          className="view-menu"
          role="menu"
          aria-label="Camera views"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              close()
            } else if (event.key === 'Tab') {
              // Return to the trigger before the browser advances focus out of the menu.
              close()
            } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault()
              setActiveIndex((index) =>
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? views.length - 1
                    : (index + (event.key === 'ArrowDown' ? 1 : -1) + views.length) % views.length,
              )
            } else if (event.key.length === 1 && /^[a-z]$/i.test(event.key)) {
              const index = views.findIndex((v) =>
                v.toLowerCase().startsWith(event.key.toLowerCase()),
              )
              if (index !== -1) {
                event.preventDefault()
                setActiveIndex(index)
              }
            }
          }}
        >
          {views.map((option, index) => (
            <button
              key={option}
              ref={(element) => {
                items.current[index] = element
              }}
              role="menuitemradio"
              aria-checked={view === option}
              tabIndex={-1}
              onFocus={() => setActiveIndex(index)}
              onClick={() => {
                onChange(option)
                close()
              }}
            >
              {option}
              {view === option && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
