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
  todoCount?: number
  doneCount?: number
  noteCount?: number
  latestWorkDate?: string | null
  recentItems?: Array<Pick<WorkItem, 'id' | 'workDate' | 'type' | 'content'>>
}

export type ImportPreview = {
  fileName: string
  date: string
  dateSource: 'metadata' | 'filename' | 'selected'
  sections: Partial<Record<ItemType, string>>
}

export type ImportMode = 'append' | 'replace'

export type SavedSearch = {
  id: number
  name: string
  period: '7D' | '14D' | '30D' | 'CUSTOM'
  fromDate: string | null
  toDate: string | null
  itemType: ItemType | null
  projectId: number | null
  query: string
}
