import type { ImportPreview, ItemType, WorkItem } from '../types'

const sectionAliases: Record<string, ItemType> = {
  todo: 'TODO', 'to do': 'TODO', '할 일': 'TODO', '해야 할 일': 'TODO',
  done: 'DONE', '완료': 'DONE', '한 일': 'DONE', '완료한 일': 'DONE',
  note: 'NOTE', notes: 'NOTE', memo: 'NOTE', '메모': 'NOTE', '회고': 'NOTE', '메모와 회고': 'NOTE',
}

export function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const parsed = new Date(`${value}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? undefined : value
}

function dateFromFileName(fileName: string) {
  const match = fileName.match(/(?:^|\D)(\d{4})[-_.]?(\d{2})[-_.]?(\d{2})(?:\D|$)/)
  return match ? validDate(`${match[1]}-${match[2]}-${match[3]}`) : undefined
}

export function parseMarkdown(fileName: string, source: string, selectedDate: string): ImportPreview {
  const metadataDate = validDate(source.match(/^---\s*\r?\n[\s\S]*?^date:\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*$[\s\S]*?^---\s*$/mi)?.[1])
  const fileDate = dateFromFileName(fileName)
  const date = metadataDate ?? fileDate ?? selectedDate
  const dateSource = metadataDate ? 'metadata' : fileDate ? 'filename' : 'selected'
  const body = source.replace(/^---\s*\r?\n[\s\S]*?^---\s*\r?\n?/m, '').trim()
  const buckets: Partial<Record<ItemType, string[]>> = {}
  let activeType: ItemType | undefined
  let activeLines: string[] = []

  const flush = () => {
    if (!activeType) return
    const content = activeLines.join('\n').trim()
    if (content) buckets[activeType] = [...(buckets[activeType] ?? []), content]
  }

  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*$/)
    const normalized = heading?.[1].trim().toLowerCase()
    const nextType = normalized ? sectionAliases[normalized] : undefined
    if (nextType) {
      flush()
      activeType = nextType
      activeLines = []
    } else if (activeType) {
      activeLines.push(line)
    }
  }
  flush()

  const sections: Partial<Record<ItemType, string>> = {}
  for (const type of ['TODO', 'DONE', 'NOTE'] as ItemType[]) {
    if (buckets[type]?.length) sections[type] = buckets[type]!.join('\n\n---\n\n')
  }
  if (!Object.keys(sections).length && body) sections.NOTE = body
  return { fileName, date, dateSource, sections }
}

export function createMarkdownExport(date: string, grouped: Partial<Record<ItemType, WorkItem[]>>) {
  const labels: Record<ItemType, string> = { TODO: 'To Do', DONE: 'Done', NOTE: 'Notes' }
  return [
    '---', `date: ${date}`, 'format: worklog-ai', '---', '', `# Worklog ${date}`, '',
    ...(['TODO', 'DONE', 'NOTE'] as ItemType[]).flatMap((type) => [
      `## ${labels[type]}`, '',
      ...(grouped[type]?.length
        ? grouped[type]!.flatMap((item, index) => [item.content, ...(index < grouped[type]!.length - 1 ? ['', '---', ''] : [])])
        : ['']),
      '',
    ]),
  ].join('\n')
}
