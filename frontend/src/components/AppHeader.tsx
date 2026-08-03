import { useRef } from 'react'

type Props = {
  date: string
  onDateChange: (date: string) => void
  onMoveDate: (days: number) => void
  onToday: () => void
  onImportFile: (file: File) => void
  onExport: () => void
}

export function AppHeader({ date, onDateChange, onMoveDate, onToday, onImportFile, onExport }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)

  return <header>
    <div>
      <span className="eyebrow">WORKLOG AI</span>
      <h1>Daily Worklog</h1>
      <p>생각의 맥락까지 남기는 나만의 업무 기록</p>
    </div>
    <div className="header-tools">
      <div className="file-actions">
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept=".md,text/markdown,text/plain"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) onImportFile(file)
          }}
        />
        <button onClick={() => fileInput.current?.click()}>MD 불러오기</button>
        <button onClick={onExport}>MD 내보내기</button>
      </div>
      <div className="date-nav">
        <button aria-label="이전 날짜" onClick={() => onMoveDate(-1)}>←</button>
        <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        <button aria-label="다음 날짜" onClick={() => onMoveDate(1)}>→</button>
        <button className="today" onClick={onToday}>오늘</button>
      </div>
    </div>
  </header>
}
