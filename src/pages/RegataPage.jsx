import { useState, useRef } from 'react'
import {
  Trophy, Upload, Trash2, Loader, ChevronDown, ChevronUp,
  X, ZoomIn, Wind, Clock, Ruler, Info, Flag, Navigation,
  MapPin, Check, ArrowRight, Calendar, BookOpen,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import useStore from '../store/useStore'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// ─── PDF extrakce ──────────────────────────────────────────────────────────

// Vykreslí stránku a ořízne přesně oblast mapy (největší mezera bez textu)
async function renderPageWithCrop(page) {
  const scale = 1.8
  const vp = page.getViewport({ scale })

  // Vykreslit celou stránku
  const canvas = document.createElement('canvas')
  canvas.width = vp.width
  canvas.height = vp.height
  const task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp })
  await (task.promise ?? task)

  const full = canvas.toDataURL('image/jpeg', 0.82).split(',')[1]

  // Převod PDF souřadnic na canvas: viewport.transform = [a,b,c,d,e,f]
  // canvas_y = b*pdfX + d*pdfY + f
  const [, tb,, td,, tf] = vp.transform  // b, d, f

  let content
  try {
    content = await page.getTextContent()
  } catch {
    return { full, crop: null }  // fallback — žádný ořez, ale full stránka OK
  }
  const textYs = []

  for (const item of content.items ?? []) {
    if (!item.str?.trim()) continue
    const pdfX = item.transform[4]
    const pdfY = item.transform[5]
    // canvas Y baseline textu
    const cy = tb * pdfX + td * pdfY + tf
    // výška písma v canvas pixelech
    const fontH = Math.abs(item.transform[3]) * scale
    // přidej horní i spodní hranu textu
    const top = cy - fontH * 0.9
    const bot = cy + fontH * 0.15
    if (bot > 0 && top < vp.height) {
      textYs.push(Math.max(top, 0), Math.min(bot, vp.height))
    }
  }

  if (textYs.length < 4) return { full, crop: null }

  textYs.sort((a, b) => a - b)

  // Najdi největší mezeru — tam leží mapa
  let gapTop = 0, gapBot = 0, maxGap = 0
  for (let i = 1; i < textYs.length; i++) {
    const gap = textYs[i] - textYs[i - 1]
    if (gap > maxGap) {
      maxGap = gap
      gapTop = textYs[i - 1]
      gapBot = textYs[i]
    }
  }

  // Mezera musí být aspoň 15 % výšky stránky, jinak žádná mapa
  if (maxGap < vp.height * 0.15) return { full, crop: null }

  const mapTop = Math.max(gapTop - 6, 0)
  const mapBot = Math.min(gapBot + 6, vp.height)
  const mapH = mapBot - mapTop

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = vp.width
  cropCanvas.height = mapH
  cropCanvas.getContext('2d').drawImage(canvas, 0, mapTop, vp.width, mapH, 0, 0, vp.width, mapH)

  return { full, crop: cropCanvas.toDataURL('image/jpeg', 0.88).split(',')[1] }
}

async function extractPdfData(file) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const totalPages = pdf.numPages
  const displayPages = Math.min(totalPages, 22)
  // pageData[i] = { full, crop } nebo null
  const pageData = []

  // Text ze všech stran (s fallbackem když getTextContent selže)
  let text = ''
  for (let i = 1; i <= totalPages; i++) {
    try {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += `\n=== STRANA ${i} ===\n`
      text += Array.from(content.items ?? []).map((it) => it.str ?? '').join(' ')
    } catch (err) {
      console.warn(`Text extraction failed on page ${i}:`, err)
    }
  }

  // Obrázky + ořez mapy
  for (let i = 1; i <= displayPages; i++) {
    const page = await pdf.getPage(i)
    pageData.push(await renderPageWithCrop(page))
  }

  return { pageData, text: text.slice(0, 45000) }
}

async function analyzeRegatta(text) {
  const res = await fetch('/api/analyze-regatta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: [], text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Chyba ${res.status}`)
  }
  return res.json()
}

// ─── Lightbox ──────────────────────────────────────────────────────────────

function ImageLightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={onClose}>
        <X size={28} />
      </button>
      <img src={src} alt="Schéma trasy" className="max-w-full max-h-full rounded-lg" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}

// ─── Practical info card ───────────────────────────────────────────────────

function PracticalInfoCard({ item }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card mb-2 p-0 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <BookOpen size={15} className="text-ocean-500 shrink-0" />
        <span className="flex-1 text-sm font-semibold text-navy-800 dark:text-white">{item.title}</span>
        {open
          ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
          : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{item.content}</p>
        </div>
      )}
    </div>
  )
}

// ─── Preview dialog ─────────────────────────────────────────────────────────

function PreviewDialog({ result, onConfirm, onCancel }) {
  const totalRaces = (result.days ?? []).reduce((sum, d) => sum + (d.races ?? []).length, 0)

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-navy-900 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85dvh] sm:max-h-[85vh] flex flex-col">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-bold text-navy-800 dark:text-white text-lg">{result.event || 'Regata'}</h2>
          {(result.location || result.dates) && (
            <p className="text-sm text-slate-500 mt-0.5">{[result.location, result.dates].filter(Boolean).join(' · ')}</p>
          )}
          {result.generalNotes && (
            <div className="mt-3 rounded-xl bg-ocean-50 dark:bg-ocean-900/20 border border-ocean-100 dark:border-ocean-800 px-3 py-2 flex gap-2">
              <Info size={13} className="text-ocean-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{result.generalNotes}</p>
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Nalezeno {totalRaces} rozjížděk v {(result.days ?? []).length} dnech
            {(result.practicalInfo ?? []).length > 0 && ` · ${result.practicalInfo.length} praktických info`}
          </p>
          {(result.days ?? []).map((day, di) => (
            <div key={di}>
              <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Calendar size={11} />{day.dayName}
              </p>
              {(day.races ?? []).map((race) => (
                <div key={race.number} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 mb-1">
                  <span className="w-6 h-6 rounded-full bg-ocean-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {race.number}
                  </span>
                  <span className="text-sm text-navy-800 dark:text-white flex-1">{race.name || `Rozjížďka ${race.number}`}</span>
                  {race.startTime && <span className="text-xs text-slate-400 flex items-center gap-0.5"><Clock size={9}/>{race.startTime}</span>}
                  {race.distanceNm && <span className="text-xs text-slate-400">{race.distanceNm} nm</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 border-t border-slate-100 dark:border-slate-700 flex gap-2 bg-white dark:bg-navy-900">
          <button className="btn-ghost flex-1" onClick={onCancel}>Zrušit</button>
          <button className="btn-ocean flex-1 flex items-center justify-center gap-1.5" onClick={() => onConfirm(result)}>
            <Check size={15} />
            Uložit regatu
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Race card ──────────────────────────────────────────────────────────────

function RaceCard({ race, imgs, onLightbox }) {
  const [open, setOpen] = useState(false)
  const pd = imgs[race.pageIndex ?? 0] ?? null
  const mapImg = pd?.crop ?? pd?.full ?? null   // oříznutá mapa, jinak celá stránka
  const fullImg = pd?.full ?? null               // celá stránka pro lightbox

  return (
    <div className="card mb-3 overflow-hidden p-0">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-ocean-500 text-white text-sm font-bold shrink-0">
          {race.number}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy-800 dark:text-white text-sm leading-tight">
            {race.name || `Rozjížďka ${race.number}`}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {race.startTime && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock size={10} className="text-ocean-400" />{race.startTime}
              </span>
            )}
            {race.distanceNm != null && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Ruler size={10} className="text-ocean-400" />{race.distanceNm} nm
              </span>
            )}
          </div>
        </div>
        {open
          ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
          : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </button>

      {/* Expanded */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700">
          {/* Route */}
          {(race.startMark || (race.marks ?? []).length > 0 || race.finishMark) && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/30">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Navigation size={11} />Trasa
              </p>
              <div className="space-y-1.5">
                {race.startMark && (
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <Flag size={9} className="text-white" />
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">Start: {race.startMark}</span>
                  </div>
                )}
                {(race.marks ?? []).map((mark, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-ocean-400 flex items-center justify-center shrink-0 text-white text-[9px] font-bold">
                      {i + 1}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{mark}</span>
                  </div>
                ))}
                {race.finishMark && (
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                      <Flag size={9} className="text-white" />
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">Cíl: {race.finishMark}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {race.notes && (
            <div className="px-4 py-2.5 flex items-start gap-2 border-t border-slate-100 dark:border-slate-700">
              <Info size={12} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{race.notes}</p>
            </div>
          )}

          {/* Map image — oříznutá na diagram trasy */}
          {mapImg ? (
            <div
              className="relative group cursor-zoom-in border-t border-slate-100 dark:border-slate-700"
              onClick={() => onLightbox(`data:image/jpeg;base64,${fullImg ?? mapImg}`)}
            >
              <img
                src={`data:image/jpeg;base64,${mapImg}`}
                alt={`Schéma rozjížďky ${race.number}`}
                className="w-full block"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                <div className="bg-black/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn size={20} />
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-5 text-center text-sm text-slate-400 border-t border-slate-100 dark:border-slate-700">
              Žádné schéma trasy
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Hlavní stránka ─────────────────────────────────────────────────────────

export default function RegataPage() {
  const { activeVoyageId, regattas, addRegatta, deleteRegatta } = useStore()
  const [uploading, setUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState('')
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const [preview, setPreview] = useState(null)
  const [pageImages, setPageImages] = useState({})
  const fileInputRef = useRef(null)

  const voyageRegattas = regattas.filter((r) => r.voyageId === activeVoyageId)
  const BUILD_VERSION = 'v8'

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') { setError('Vyberte PDF soubor.'); return }
    setError('')
    setUploading(true)
    let stage = 'start'
    try {
      stage = 'načítání PDF'
      setUploadStep('Načítám PDF…')
      const { pageData, text } = await extractPdfData(file)
      stage = 'volání Claude API'
      setUploadStep('Claude analyzuje rozjížďky…')
      const result = await analyzeRegatta(text)
      setPreview({ result, pageData })
    } catch (e) {
      const detail = [
        `[${stage}]`,
        e?.name && `${e.name}:`,
        e?.message || String(e),
        e?.stack && `\n${String(e.stack).split('\n').slice(0, 3).join('\n')}`,
      ].filter(Boolean).join(' ')
      setError(detail)
      console.error('Regata error:', e)
    } finally {
      setUploading(false)
      setUploadStep('')
    }
  }

  const handleConfirm = (result) => {
    if (!preview) return
    const id = crypto.randomUUID()
    addRegatta({ voyageId: activeVoyageId, id, ...result })
    setPageImages((prev) => ({ ...prev, [id]: preview.pageData }))
    setPreview(null)
  }

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy size={22} className="text-ocean-500" />
          <h1 className="text-xl font-bold text-navy-800 dark:text-white">Regata</h1>
          <span className="text-[10px] text-slate-400 ml-1">{BUILD_VERSION}</span>
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

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-xs flex items-start gap-2">
          <pre className="flex-1 whitespace-pre-wrap break-words font-mono leading-relaxed">{error}</pre>
          <button onClick={() => setError('')} className="shrink-0"><X size={14} /></button>
        </div>
      )}

      {/* Loading */}
      {uploading && (
        <div className="mb-4 card flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <Loader size={18} className="animate-spin text-ocean-500 shrink-0" />
          <span>{uploadStep || 'Zpracovávám…'}</span>
        </div>
      )}

      {/* Empty */}
      {voyageRegattas.length === 0 && !uploading && (
        <div className="card border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Trophy size={40} className="text-slate-300 dark:text-slate-600" />
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300">Žádné regaty</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Nahraj lodní deník ve formátu PDF
            </p>
          </div>
          <button className="btn-ocean flex items-center gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            Nahrát lodní deník (PDF)
          </button>
        </div>
      )}

      {/* Regattas */}
      {voyageRegattas.map((regatta) => {
        const imgs = pageImages[regatta.id] ?? []   // imgs[i] = { full, crop }
        return (
          <div key={regatta.id} className="mb-8">
            {/* Regatta header */}
            <div className="flex items-start justify-between mb-1">
              <div>
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
              <div className="mb-4 rounded-xl bg-ocean-50 dark:bg-ocean-900/20 border border-ocean-100 dark:border-ocean-800 px-4 py-3 flex gap-3">
                <Info size={15} className="text-ocean-500 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{regatta.generalNotes}</p>
              </div>
            )}

            {/* Praktické informace — vyfiltruj vizuální témata (vlajky, čísla) */}
            {(() => {
              const filtered = (regatta.practicalInfo ?? []).filter(
                (item) => !/vlajk|rozlišovac.*čísl|startovac.*čísl/i.test(item.title ?? '')
              )
              return filtered.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ocean-500 text-white">
                    <BookOpen size={12} />
                    <span className="text-xs font-semibold">Praktické informace</span>
                  </div>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>
                {filtered.map((item, i) => (
                  <PracticalInfoCard key={i} item={item} />
                ))}
              </div>
            )
            })()}

            {/* Days — závodní i volné */}
            {(regatta.days ?? []).map((day, di) => {
              const hasRaces = (day.races ?? []).length > 0
              return (
                <div key={di} className="mb-5">
                  {/* Day header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white ${hasRaces ? 'bg-navy-800 dark:bg-navy-700' : 'bg-slate-400 dark:bg-slate-600'}`}>
                      <Calendar size={12} />
                      <span className="text-xs font-semibold">{day.dayName}</span>
                    </div>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-xs text-slate-400">
                      {hasRaces ? `${day.races.length} rozj.` : 'volno'}
                    </span>
                  </div>

                  {/* Informační karta pro nezávodní dny */}
                  {!hasRaces && day.dayNotes && (
                    <div className="card p-4 flex gap-3 mb-3">
                      <Info size={16} className="text-ocean-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{day.dayNotes}</p>
                    </div>
                  )}

                  {/* Race cards */}
                  {(day.races ?? []).map((race) => (
                    <RaceCard key={race.number} race={race} imgs={imgs} onLightbox={setLightbox} />
                  ))}
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

      {preview && (
        <PreviewDialog
          result={preview.result}
          onConfirm={handleConfirm}
          onCancel={() => setPreview(null)}
        />
      )}

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}
