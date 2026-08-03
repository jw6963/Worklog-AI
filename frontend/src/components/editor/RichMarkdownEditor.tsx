import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Placeholder from '@tiptap/extension-placeholder'

type Props = {
  value: string
  placeholder: string
  onChange: (markdown: string) => void
  onSubmit: () => void
  onCancel?: () => void
  autoFocus?: boolean
}

export function RichMarkdownEditor({ value, placeholder, onChange, onSubmit, onCancel, autoFocus = false }: Props) {
  const submitRef = useRef(onSubmit)
  const cancelRef = useRef(onCancel)
  submitRef.current = onSubmit
  cancelRef.current = onCancel

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'notion-editor',
        'aria-label': placeholder,
      },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault()
          submitRef.current()
          return true
        }
        if (event.key === 'Escape' && cancelRef.current) {
          event.preventDefault()
          cancelRef.current()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getMarkdown()),
  })

  useEffect(() => {
    if (!editor || editor.getMarkdown() === value) return
    editor.commands.setContent(value, { contentType: 'markdown' })
  }, [editor, value])

  useEffect(() => {
    if (editor && autoFocus) editor.commands.focus('end')
  }, [autoFocus, editor])

  return <EditorContent editor={editor} />
}
