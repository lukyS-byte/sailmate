import { useState, useRef } from 'react'
import { Trophy, Upload, Trash2, Loader, ChevronDown, ChevronUp, X, ZoomIn, Wind, Clock, Ruler, Info, Map as MapIcon, Flag, Navigation } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import useStore from '../store/useStore'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

async function extractPdfData(file) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const numPages = Math.min(pdf.numPages, 20)
  const displayImages = []
  const pageTexts = []

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)

    // Text
    const content = await page.getTextContent()
    const items = Array.from(content.items ?? [])
    pageTexts.push(items.map((it) => it.str ?? '').join(' '))

    // Display image
    const vp = page.getViewport({ scale: 1.8 })
    const canvas = document.createElement('canvas')
    canvas.width = vp.width
    canvas.height = vp.height
    const task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp })
    await (task.promise ?? task)
    displayImages.push(canvas.toDataURL('image/jpeg', 0.82).split(',')[1])
  }

  return { displayImages, pageTexts }
}

// ─── Client-side parser — bez API klíče ────────────────────────────────────

function charToPage(index, pageTexts) {
  let cum = 0
  for (let p = 0; p < pageTexts.length; p++) {
    cum += pageTexts[p].length + 1
    if (index < cum) return p
  }
  return pageTexts.length - 1
}

function extractTimeDate(ctx) {
  const timeM = ctx.match(/\b([01]?\d|2[0-3])[:\.]([0-5]\d)\b/)
  const startTime = timeM ? `${timeM[1].padStart(2, '0')}:${timeM[2]}` : null

  const dM = ctx.match(/(\d{1,2})\s*[.\-\/]\s*(\d{1,2})(?:\s*[.\-\/]\s*(\d{2,4}))?/)
  let date = null
  if (dM) {
    const y = dM[3] ? (dM[3].length === 2 ? '20' + dM[3] : dM[3]) : new Date().getFullYear()
    const mo = parseInt(dM[2]), dy = parseInt(dM[1])
    if (mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31)
      date = `${y}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')}`
  }
  const nmM = ctx.match(/(\d+(?:[.,]\d+)?)\s*(?:nm|NM|nmi)/i)
  const distanceNm = nmM ? parseFloat(nmM[1].replace(',', '.')) : null
  return { startTime, date, distanceNm }
}

function parseRegatta(pageTexts) {
  const fullText = pageTexts.join('\n')

  // === Název — první smysluplná věta na první stránce ===
  const titleLine = (pageTexts[0] ?? '')
    .split(/\s{2,}|\n/)
    .map(s => s.trim())
    .find(s => s.length > 4 && s.length < 100 && /[a-zA-ZčšžýáíéúůóđČŠŽÝÁÍÉÚŮÓĐ]/.test(s))
  const event = titleLine ?? 'Regata'

  // === Místo ===
  const locM = fullText.match(
    /(?:místo|venue|location|marina|přístav|port|club|klub|yacht\s*club)[:\s]+([^\n,\.]{3,50})/i
  )
  const location = locM?.[1]?.trim() ?? null

  // === Termín — první výskyt data ===
  const dateM = fullText.match(/\d{1,2}\s*[.\-\/]\s*\d{1,2}\s*[.\-\/]?\s*(?:20\d{2})?/)
  const dates = dateM?.[0] ?? null

  // === Stránky se schématy — nízká hustota textu ===
  const lens = pageTexts.map(t => t.replace(/\s+/g, '').length)
  const avg = lens.reduce((a, b) => a + b, 0) / Math.max(lens.length, 1)
  const importantPageIndexes = lens
    .map((len, i) => ({ i, len }))
    .filter(({ len }) => len > 20 && len < avg * 0.55)
    .map(({ i }) => i)
    .slice(0, 8)

  // === Rozjížďky — 5 strategií ===
  const seen = new Set()
  const races = []

  const addRace = (num, index, ctxOverride) => {
    if (num < 1 || num > 25 || seen.has(num)) return
    seen.add(num)
    const ctx = ctxOverride ?? fullText.slice(Math.max(0, index - 80), index + 500)
    const { startTime, date, distanceNm } = extractTimeDate(ctx)
    const pageIndex = charToPage(index, pageTexts)
    races.push({ number: num, date, startTime, distanceNm, courseType: null, marks: null, notes: null, windNotes: null, pageIndex })
  }

  // Strategie 1: explicitní klíčová slova (CZ + EN)
  const kwRx = /(?:rozjížďka|závod|race|start|jízda|kolo)\s*[:\-#.]?\s*(\d{1,2})\b/gi
  let m
  while ((m = kwRx.exec(fullText)) !== null) addRace(parseInt(m[1]), m.index)

  // Strategie 2: "R.1", "R-1", "R1" (zkratky v plánech)
  if (seen.size === 0) {
    const rAbbrRx = /\bR[.\-\s]?(\d{1,2})\b/g
    while ((m = rAbbrRx.exec(fullText)) !== null) addRace(parseInt(m[1]), m.index)
  }

  // Strategie 3: tabulka programu — číslo + čas na řádku (např. "1  15.6.  10:00")
  if (seen.size === 0) {
    const schedRx = /^[\s]*(\d{1,2})[\s,.\-]+(?:\d{1,2}[\s,.\-]+\d{1,4}[\s,.\-]+)?([01]?\d|2[0-3])[:\.]([0-5]\d)/gm
    while ((m = schedRx.exec(fullText)) !== null) {
      const num = parseInt(m[1])
      if (num >= 1 && num <= 20) addRace(num, m.index)
    }
  }

  // Strategie 4: hledáme START časy — každý unikátní čas = pravděpodobně jedna rozjížďka
  if (seen.size === 0) {
    const times = [...fullText.matchAll(/\b([01]?\d|2[0-3])[:\.]([0-5]\d)\b/g)]
    const uniqueTimes = [...new Set(times.map(t => `${t[1]}:${t[2]}`))]
    if (uniqueTimes.length > 0 && uniqueTimes.length <= 20) {
      uniqueTimes.forEach((_, i) => {
        const t = times[i]
        if (t) addRace(i + 1, t.index)
      })
    }
  }

  // Strategie 5 (fallback): jedna karta pro každou diagram stránku
  if (seen.size === 0) {
    if (importantPageIndexes.length > 0) {
      importantPageIndexes.forEach((pi, i) => {
        const pageStart = pageTexts.slice(0, pi).reduce((s, t) => s + t.length + 1, 0)
        addRace(i + 1, pageStart)
      })
    } else {
      // Absolutní fallback
      races.push({ number: 1, date: null, startTime: null, distanceNm: null, courseType: null, marks: null, notes: null, windNotes: null, pageIndex: 0 })
    }
  }

  races.sort((a, b) => a.number - b.number)
  return { event, location, dates, generalNotes: null, importantPageIndexes, races }
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
      const { displayImages, pageTexts } = await extractPdfData(file)
      setUploadStep('Zpracovávám závodní pokyny…')
      const result = parseRegatta(pageTexts)
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

        return (
          <div key={regatta.id} className="mb-8">
            {/* Regatta header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg text-navy-800 dark:text-white leading-tight">
                  {regatta.event || 'Regata'}
                </h2>
                {(regatta.location || regatta.dates) && (
                  <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                    {regatta.location && <><MapIcon size={12} className="shrink-0" />{regatta.location}</>}
                    {regatta.location && regatta.dates && <span>·</span>}
                    {regatta.dates && regatta.dates}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {regatta.races?.length ?? 0} rozjížděk · {imgs.length} stran PDF
                </p>
              </div>
              <button
                className="btn-ghost p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 ml-2"
                onClick={() => deleteRegatta(regatta.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Race cards — každá rozjížďka jako karta s obrázkem */}
            <div className="space-y-4">
              {(regatta.races ?? []).map((race) => {
                const key = `${regatta.id}-${race.number}`
                const isOpen = expanded.has(key)
                // Prioritizujeme diagram stránku, fallback na stránku podle pageIndex
                const diagramPages = regatta.importantPageIndexes ?? []
                const pageImg = (
                  imgs[diagramPages[race.number - 1]] ??
                  imgs[race.pageIndex ?? 0] ??
                  imgs[0] ??
                  null
                )

                return (
                  <div key={key} className="card overflow-hidden p-0 shadow-sm">
                    {/* PDF stránka — vždy viditelná nahoře */}
                    {pageImg ? (
                      <div
                        className="relative cursor-zoom-in bg-slate-100 dark:bg-slate-800"
                        onClick={() => setLightbox(`data:image/jpeg;base64,${pageImg}`)}
                      >
                        <img
                          src={`data:image/jpeg;base64,${pageImg}`}
                          alt={`Rozjížďka ${race.number}`}
                          className="w-full block max-h-64 object-cover object-top"
                        />
                        {/* Badge rozjížďky přes obrázek */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-ocean-500 text-white text-base font-bold shadow-lg">
                            {race.number}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3 bg-black/40 text-white rounded-full p-1.5">
                          <ZoomIn size={14} />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-100 dark:bg-slate-800 h-28 flex items-center justify-center">
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-ocean-500 text-white text-xl font-bold">
                          {race.number}
                        </span>
                      </div>
                    )}

                    {/* Info sekce pod obrázkem */}
                    <div className="px-4 pt-3 pb-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-navy-800 dark:text-white text-base">
                          Rozjížďka {race.number}
                        </h3>
                        <button
                          className="text-slate-400 hover:text-slate-600 p-1"
                          onClick={() => toggle(key)}
                        >
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>

                      {/* Rychlé info — vždy viditelné */}
                      <div className="flex flex-wrap gap-3 mt-2 mb-3">
                        {race.date ? (
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                            <span className="w-6 h-6 rounded-lg bg-ocean-50 dark:bg-ocean-900/30 flex items-center justify-center">
                              <Flag size={12} className="text-ocean-500" />
                            </span>
                            {new Date(race.date + 'T00:00:00').toLocaleDateString('cs', { day: 'numeric', month: 'short' })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-slate-400">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                              <Flag size={12} />
                            </span>
                            Datum neznámé
                          </div>
                        )}

                        {race.startTime ? (
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                            <span className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                              <Clock size={12} className="text-amber-500" />
                            </span>
                            Start {race.startTime}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-slate-400">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                              <Clock size={12} />
                            </span>
                            Čas neznámý
                          </div>
                        )}

                        {race.distanceNm != null && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                            <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                              <Ruler size={12} className="text-emerald-500" />
                            </span>
                            {race.distanceNm} nm
                          </div>
                        )}

                        {race.courseType && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                            <span className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                              <Navigation size={12} className="text-purple-500" />
                            </span>
                            {race.courseType}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rozbalitelné detaily */}
                    {isOpen && (race.windNotes || race.marks || race.notes) && (
                      <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 space-y-2">
                        {race.windNotes && (
                          <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Wind size={13} className="text-ocean-500 shrink-0 mt-0.5" />
                            <span>{race.windNotes}</span>
                          </div>
                        )}
                        {race.marks && (
                          <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Navigation size={13} className="text-amber-500 shrink-0 mt-0.5" />
                            <span>{race.marks}</span>
                          </div>
                        )}
                        {race.notes && (
                          <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Info size={13} className="text-slate-400 shrink-0 mt-0.5" />
                            <span>{race.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
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
