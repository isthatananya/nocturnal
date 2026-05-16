import { useRef, useState } from 'react'
import { Upload, FileText } from 'lucide-react'

interface Props {
  onFile: (file: File) => void
  accept?: string
  disabled?: boolean
}

export default function FileDropzone({ onFile, accept = '.csv,.json', disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200 ${
        disabled ? 'opacity-50 cursor-not-allowed' :
        dragging  ? 'border-indigo-500 bg-indigo-500/5' :
                    'border-white/10 hover:border-white/25 hover:bg-white/2'
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" disabled={disabled} />
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
        {dragging ? <FileText size={24} className="text-indigo-400" /> : <Upload size={24} className="text-indigo-400" />}
      </div>
      <div className="text-center">
        <p className="text-slate-200 font-medium">Drop your financial data here</p>
        <p className="text-slate-500 text-sm mt-1">CSV or JSON · parsed entirely in your browser</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Your data never leaves this device
      </div>
    </div>
  )
}
