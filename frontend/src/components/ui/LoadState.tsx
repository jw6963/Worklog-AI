type Props = {
  loading?: boolean
  error?: string
  onRetry?: () => void
}

export function LoadState({ loading, error, onRetry }: Props) {
  if (loading) return <div className="load-state" role="status"><i /><span>불러오는 중…</span></div>
  if (!error) return null
  return <div className="load-state error-state" role="alert">
    <span>{error}</span>
    {onRetry && <button type="button" onClick={onRetry}>다시 시도</button>}
  </div>
}
