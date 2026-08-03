type Props = { label: string; value: number | string; caption?: string; tone?: 'default' | 'green' | 'amber' }

export function StatCard({ label, value, caption, tone = 'default' }: Props) {
  return <article className={`stat-card ${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    {caption && <small>{caption}</small>}
  </article>
}
