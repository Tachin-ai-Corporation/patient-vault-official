'use client'

import { type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import { slugifyHeading } from '@/lib/docs-shared'
import { MethodBadge } from '@/components/docs/method-badge'
import { cn } from '@/lib/utils'

// Flatten react-markdown children into a plain string for id/badge derivation.
function childrenToText(children: ReactNode): string {
  if (children == null) return ''
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }
  if (Array.isArray(children)) return children.map(childrenToText).join('')
  if (
    typeof children === 'object' &&
    'props' in (children as { props?: { children?: ReactNode } }) &&
    (children as { props?: { children?: ReactNode } }).props
  ) {
    return childrenToText(
      (children as { props: { children?: ReactNode } }).props.children,
    )
  }
  return ''
}

const METHOD_HEADING_RE = /^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/

export function DocMarkdown({ body }: { body: string }) {
  return (
    <div className="docs-prose max-w-none text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeHighlight, { ignoreMissing: true }]]}
        components={{
          h2({ children }) {
            const text = childrenToText(children)
            const id = slugifyHeading(text)
            const match = text.match(METHOD_HEADING_RE)
            return (
              <h2
                id={id}
                className="group mt-12 scroll-mt-32 border-t border-border pt-8 text-lg font-semibold tracking-tight text-foreground first:mt-0 first:border-t-0 first:pt-0"
              >
                {match ? (
                  <span className="flex flex-wrap items-center gap-2.5">
                    <MethodBadge method={match[1]} />
                    <span className="font-mono text-base text-foreground">
                      {match[2]}
                    </span>
                  </span>
                ) : (
                  children
                )}
              </h2>
            )
          },
          h3({ children }) {
            const text = childrenToText(children)
            return (
              <h3
                id={slugifyHeading(text)}
                className="mt-8 scroll-mt-32 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {children}
              </h3>
            )
          },
          h4({ children }) {
            return (
              <h4 className="mt-6 text-sm font-semibold text-foreground">
                {children}
              </h4>
            )
          },
          p({ children }) {
            return (
              <p className="mt-4 leading-relaxed text-foreground/90">
                {children}
              </p>
            )
          },
          ul({ children }) {
            return (
              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-foreground/90 marker:text-muted-foreground">
                {children}
              </ul>
            )
          },
          ol({ children }) {
            return (
              <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-foreground/90 marker:text-muted-foreground">
                {children}
              </ol>
            )
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>
          },
          a({ children, href }) {
            return (
              <a
                href={href}
                className="font-medium text-teal underline-offset-2 hover:underline"
              >
                {children}
              </a>
            )
          },
          hr() {
            return <hr className="my-10 border-border" />
          },
          strong({ children }) {
            return (
              <strong className="font-semibold text-foreground">
                {children}
              </strong>
            )
          },
          table({ children }) {
            return (
              <div className="mt-5 overflow-x-auto rounded-card border border-border">
                <table className="w-full border-collapse text-left text-[13px]">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-muted/60">{children}</thead>
          },
          th({ children }) {
            return (
              <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className="border-b border-border/60 px-3 py-2 align-top text-foreground/90">
                {children}
              </td>
            )
          },
          pre({ children }) {
            return (
              <pre className="mt-4 overflow-x-auto rounded-card border border-border bg-[#202833] p-4 text-[13px] leading-relaxed">
                {children}
              </pre>
            )
          },
          code({ className, children }) {
            const isBlock =
              typeof className === 'string' &&
              (className.includes('language-') || className.includes('hljs'))
            if (isBlock) {
              return (
                <code className={cn('font-mono', className)}>{children}</code>
              )
            }
            return (
              <code className="rounded-tag border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-aqua">
                {children}
              </code>
            )
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}
