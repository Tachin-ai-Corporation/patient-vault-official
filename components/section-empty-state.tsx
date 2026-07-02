type SectionEmptyStateProps = {
  eyebrow: string
  title: string
  description: string
}

export function SectionEmptyState({
  eyebrow,
  title,
  description,
}: SectionEmptyStateProps) {
  return (
    <section className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground text-balance">
        {title}
      </h2>
      <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground text-pretty">
        {description}
      </p>
    </section>
  )
}
