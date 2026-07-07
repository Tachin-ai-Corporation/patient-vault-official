'use client'

import { useEffect, useRef, useState, ReactNode, CSSProperties } from 'react'

interface ParallaxProps {
  /** Positive moves slower/up as you scroll past; try 0.1–0.4 for subtle effect */
  speed?: number
  className?: string
  style?: CSSProperties
  children: ReactNode
  /** When true, fades + slides children in as they enter the viewport */
  reveal?: boolean
  /** When false, skips the continuous scroll translate (use with reveal for sections) */
  translate?: boolean
  as?: 'div' | 'section'
}

export function Parallax({
  speed = 0.2,
  className,
  style,
  children,
  reveal = false,
  translate = true,
  as = 'div',
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [revealed, setRevealed] = useState(!reveal)
  const prefersReduced = useRef(false)

  useEffect(() => {
    prefersReduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced.current) {
      setRevealed(true)
      return
    }

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        if (translate) {
          const viewportCenter = window.innerHeight / 2
          const elementCenter = rect.top + rect.height / 2
          const distance = elementCenter - viewportCenter
          setOffset(-distance * speed)
        }

        if (reveal && rect.top < window.innerHeight * 0.85) {
          setRevealed(true)
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [speed, reveal, translate])

  const Tag = as

  const transformValue =
    prefersReduced.current || !translate
      ? undefined
      : `translate3d(0, ${offset}px, 0)`

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        ...style,
        transform: transformValue,
        opacity: revealed ? 1 : 0,
        transition: reveal
          ? 'opacity 600ms cubic-bezier(0.16,1,0.3,1)'
          : undefined,
        willChange: translate ? 'transform' : 'opacity',
      }}
    >
      {children}
    </Tag>
  )
}
