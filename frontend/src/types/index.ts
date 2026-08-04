export type ItemType = 'TODO' | 'DONE' | 'NOTE'

export type WorkItem = {
  id: number
  workDate: string
  type: ItemType
  content: string
  updatedAt?: string
  project?: Project | null
  flowId?: string | null
  carriedToDate?: string | null
  flowCurrentDate?: string | null
  flowCompletedDate?: string | null
}

export type Project = {
  id: number
  name: string
  color: string
  archived: boolean
  itemCount?: number
}

export type ImportPreview = {
  fileName: string
  date: string
  dateSource: 'metadata' | 'filename' | 'selected'
  sections: Partial<Record<ItemType, string>>
}

export type ImportMode = 'append' | 'replace'
