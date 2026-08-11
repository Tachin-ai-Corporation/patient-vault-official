'use client'

import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { currentLoginIntent, saveLoginIntent } from '@/lib/login-intent'

type SignInLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
}

export function SignInLink({ href, onClick, children, ...props }: SignInLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (event.defaultPrevented) return
    saveLoginIntent(currentLoginIntent())
  }

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}
