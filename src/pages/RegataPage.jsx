import { useState, useRef } from 'react'
import { Trophy, Upload, Trash2, Loader, ChevronDown, ChevronUp, X, ZoomIn, Wind, Clock, Ruler, Info, Map, Flag, Navigation } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import useStore from '../store/useStore'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

async function extractPdfData(file) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const numPages = Math.min(pdf.numPages, 20)
  const displayImages = []
  let text = ''

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)

    // Text
    const content = await page.getTextContent()
    text += content.items.map((it) => it.str).join(' ') + '\n'

    // Display image — vysoká kvalita pro zobrazení
    const viewport = page.getViewport({ scale: 1.8 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    displayImages.push(canvas.toDataURL('image/jpeg', 0.82).split(',')[1])
  }

  // Analysis images — menší pro Claude (scale 1.0, nižší kvalita)
  const analysisImages = []
  for (let i = 1; i <= Math.min(numPages, 8); i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.0 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    analysisImages.push(canvas.toDataURL('image/jpeg', 0.65).split(',')[1])
  }

  return { displayImages, analysisImages, text: text.slice(0, 6000) }
}

async function analyzeRegatta(text, images) {
  const res = await fetch('/api/analyze-regatta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Chyba ${res.status}`)
  }
  return res.json()
}

function ImageLightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={onClose}>
        <X size={28} />
      </button>
      <img
        src={src}
        alt="PDF stránka"
        className="max-w-full max-h-full rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

export default function RegataPage() {
  const { activeVoyageId, regattas, addRegatta, deleteRegatta } = useStore()
  const [uploading, setUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(new Set())
  const [lightbox, setLightbox] = useState(null)
  const [pageImages, setPageImages] = useState({}) // { [regattaId]: string[] }
  const fileInputRef = useRef(null)

  const voyageRegattas = regattas.filter((r) => r.voyageId === activeVoyageId)

  const toggle = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') { setError('Vyberte PDF soubor.'); return }
    setError('')
    setUploading(true)
    try {
      setUploadStep('Načítám PDF…')
      const { displayImages, analysisImages, text } = await extractPdfData(file)
      setUploadStep('Claude analyzuje závodní pokyny…')
      const result = await analyzeRegatta(text, analysisImages)
      const regattaId = crypto.randomUUID()
      addRegatta({ voyageId: activeVoyageId, id: regattaId, ...result })
      setPageImages((prev) => ({ ...prev, [regattaId]: displayImages }))
      setExpanded(new Set((result.races ?? []).map((r) => `${regattaId}-${r.number}`)))
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
      setUploadStep('')
    }
  }

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy size={22} className="text-ocean-500" />
          <h1 className="text-xl font-bold text-navy-800 dark:text-white">Regata</h1>
        </div>
        {voyageRegattas.length > 0 && (
          <button
            className="btn-ocean flex items-center gap-1.5 text-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader size={15} className="animate-spin" /> : <Upload size={15} />}
            Nahrát PDF
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex items-center gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {uploading && (
        <div className="mb-4 card flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <Loader size={18} className="animate-spin text-ocean-500 shrink-0" />
          <span>{uploadStep || 'Zpracovávám…'}</span>
        </div>
      )}

      {/* Empty state */}
      {voyageRegattas.length === 0 && !uploading && (
        <div className="card border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Trophy size={40} className="text-slate-300 dark:text-slate-600" />
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300">Žádné regaty</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Nahraj závodní pokyny ve formátu PDF
            </p>
          </div>
          <button
            className="btn-ocean flex items-center gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            Nahraj závodní pokyny (PDF)
          </button>
        </div>
      )}

      {/* Regatta list */}
      {voyageRegattas.map((regatta) => {
        const imgs = pageImages[regatta.id] ?? []
        const importantImgs = (regatta.importantPageIndexes ?? [])
          .map((idx) => imgs[idx])
          .filter(Boolean)

        return (
          <div key={regatta.id} className="mb-8">
            {/* Regatta title bar */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg text-navy-800 dark:text-white leading-tight">
                  {regatta.event || 'Regata'}
                </h2>
                {(regatta.location || regatta.dates) && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[regatta.location, regatta.dates].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <button
                className="btn-ghost p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 ml-2"
                onClick={() => deleteRegatta(regatta.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* General notes */}
            {regatta.generalNotes && (
              <div className="mb-3 rounded-xl bg-ocean-50 dark:bg-ocean-900/20 border border-ocean-100 dark:border-ocean-800 px-4 py-3 flex gap-3">
                <Info size={15} className="text-ocean-500 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {regatta.generalNotes}
                </p>
              </div>
            )}

            {/* Important diagrams / maps */}
            {importantImgs.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Map size={13} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Schémata tratí
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {importantImgs.map((img, i) => (
                    <div
                      key={i}
                      className="shrink-0 rounded-xl overflow-hidden cursor-zoom-in border border-slate-200 dark:border-slate-700"
                      style={{ width: importantImgs.length === 1 ? '100%' : '80vw', maxWidth: 480 }}
                      onClick={() => setLightbox(`data:image/jpeg;base64,${img}`)}
                    >
                      <img
                        src={`data:image/jpeg;base64,${img}`}
                        alt={`Schéma ${i + 1}`}
                        className="w-full block"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Race cards */}
            {(regatta.races ?? []).map((race) => {
              const key = `${regatta.id}-${race.number}`
              const isOpen = expanded.has(key)
              const pageImg = imgs[race.pageIndex ?? 0] ?? imgs[0] ?? null

              return (
                <div key={key} className="card mb-3 overflow-hidden p-0">
                  {/* Race header */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    onClick={() => toggle(key)}
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ocean-500 text-white text-sm font-bold shrink-0">
                      {race.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-navy-800 dark:text-white text-sm">
                          Rozjížďka {race.number}
                        </p>
                        {race.courseType && (
                          <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                            {race.courseType}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0 mt-0.5">
                        {race.date && (
                          <span className="text-xs text-slate-500">{race.date}</span>
                        )}
                        {race.startTime && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock size={10} />{race.startTime}
                          </span>
                        )}
                        {race.distanceNm != null && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Ruler size={10} />{race.distanceNm} nm
                          </span>
                        )}
                      </div>
                    </div>
                    {isOpen
                      ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
                      : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                  </button>

                  {/* Expanded content */}
                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-700">
                      {/* Info pills */}
                      {(race.windNotes || race.marks || race.notes) && (
                        <div className="px-4 py-3 space-y-2">
                          {race.windNotes && (
                            <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                              <Wind size={12} className="text-ocean-500 shrink-0 mt-0.5" />
                              <span>{race.windNotes}</span>
                            </div>
                          )}
                          {race.marks && (
                            <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                              <Navigation size={12} className="text-amber-500 shrink-0 mt-0.5" />
                              <span>{race.marks}</span>
                            </div>
                          )}
                          {race.notes && (
                            <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                              <Flag size={12} className="text-slate-400 shrink-0 mt-0.5" />
                              <span>{race.notes}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* PDF page image */}
                      {pageImg ? (
                        <div
                          className="relative group cursor-zoom-in"
                          onClick={() => setLightbox(`data:image/jpeg;base64,${pageImg}`)}
                        >
                          <img
                            src={`data:image/jpeg;base64,${pageImg}`}
                            alt={`Schéma rozjížďky ${race.number}`}
                            className="w-full block"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="bg-black/40 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ZoomIn size={20} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-6 text-center text-sm text-slate-400">
                          Žádné schéma k dispozici
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}
