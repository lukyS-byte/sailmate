import { useState, useRef } from 'react'
import { Trophy, Upload, Trash2, Loader, ChevronDown, ChevronUp, X, ZoomIn, Wind, Clock, Ruler, Plus, Minus } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import useStore from '../store/useStore'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// ─── PDF extrakce ──────────────────────────────────────────────────────────

async function extractPdfData(file) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const numPages = Math.min(pdf.numPages, 20)
  const images = []
  const pageTexts = []

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pageTexts.push(Array.from(content.items ?? []).map((it) => it.str ?? '').join(' '))
    const vp = page.getViewport({ scale: 1.8 })
    const canvas = document.createElement('canvas')
    canvas.width = vp.width
    canvas.height = vp.height
    const task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp })
    await (task.promise ?? task)
    images.push(canvas.toDataURL('image/jpeg', 0.82).split(',')[1])
  }
  return { images, pageTexts }
}

// ─── Parser bez API ────────────────────────────────────────────────────────

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

  // Název
  const titleLine = (pageTexts[0] ?? '').split(/\s{2,}|\n/).map(s => s.trim())
    .find(s => s.length > 4 && s.length < 100 && /[a-zA-ZčšžýáíéúůóđČŠŽÝÁÍÉÚŮÓĐ]/.test(s))
  const event = titleLine ?? 'Regata'

  // Místo
  const locM = fullText.match(/(?:místo|venue|location|marina|přístav|port|klub|yacht\s*club)[:\s]+([^\n,\.]{3,50})/i)
  const location = locM?.[1]?.trim() ?? null

  // Datum
  const dateM = fullText.match(/\d{1,2}\s*[.\-\/]\s*\d{1,2}\s*[.\-\/]?\s*(?:20\d{2})?/)
  const dates = dateM?.[0] ?? null

  // Stránky se schématy
  const lens = pageTexts.map(t => t.replace(/\s+/g, '').length)
  const avg = lens.reduce((a, b) => a + b, 0) / Math.max(lens.length, 1)
  const importantPageIndexes = lens
    .map((len, i) => ({ i, len }))
    .filter(({ len }) => len > 20 && len < avg * 0.55)
    .map(({ i }) => i)
    .slice(0, 8)

  // Rozjížďky — 5 strategií
  const seen = new Set()
  const races = []

  const addRace = (num, index) => {
    if (num < 1 || num > 25 || seen.has(num)) return
    seen.add(num)
    const ctx = fullText.slice(Math.max(0, index - 80), index + 500)
    const { startTime, date, distanceNm } = extractTimeDate(ctx)
    const pageIndex = charToPage(index, pageTexts)
    races.push({ number: num, date, startTime, distanceNm, windNotes: null, pageIndex })
  }

  let m
  // 1: klíčová slova
  const kwRx = /(?:rozjížďka|závod|race|start|jízda|kolo)\s*[:\-#.]?\s*(\d{1,2})\b/gi
  while ((m = kwRx.exec(fullText)) !== null) addRace(parseInt(m[1]), m.index)

  // 2: R1, R.2
  if (seen.size === 0) {
    const rRx = /\bR[.\-\s]?(\d{1,2})\b/g
    while ((m = rRx.exec(fullText)) !== null) addRace(parseInt(m[1]), m.index)
  }

  // 3: tabulka programu
  if (seen.size === 0) {
    const schedRx = /^[\s]*(\d{1,2})[\s,.\-]+(?:\d{1,2}[\s,.\-]+\d{1,4}[\s,.\-]+)?([01]?\d|2[0-3])[:\.]([0-5]\d)/gm
    while ((m = schedRx.exec(fullText)) !== null) {
      const n = parseInt(m[1]); if (n >= 1 && n <= 20) addRace(n, m.index)
    }
  }

  // 4: každý unikátní čas = rozjížďka
  if (seen.size === 0) {
    const times = [...fullText.matchAll(/\b([01]?\d|2[0-3])[:\.]([0-5]\d)\b/g)]
    const unique = [...new Map(times.map(t => [`${t[1]}:${t[2]}`, t])).values()]
    if (unique.length >= 2 && unique.length <= 20) unique.forEach((t, i) => addRace(i + 1, t.index))
  }

  races.sort((a, b) => a.number - b.number)
  return { event, location, dates, races, importantPageIndexes, autoDetected: races.length > 1 }
}

// Vytvoř N rozjížděk z obrázků — rovnoměrně rozdělí stránky
function buildRacesFromCount(count, images, importantPageIndexes) {
  return Array.from({ length: count }, (_, i) => {
    // Prioritizuj diagram stránky, pak rovnoměrně
    const diagrams = importantPageIndexes.length > 0 ? importantPageIndexes : images.map((_, p) => p)
    const pageIndex = diagrams[Math.min(i, diagrams.length - 1)] ?? i
    return { number: i + 1, date: null, startTime: null, distanceNm: null, windNotes: null, pageIndex }
  })
}

// ─── Lightbox ──────────────────────────────────────────────────────────────

function ImageLightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={onClose}>
        <X size={28} />
      </button>
      <img src={src} alt="PDF stránka" className="max-w-full max-h-full rounded-lg" onClick={e => e.stopPropagation()} />
    </div>
  )
}

// ─── Hlavní komponenta ─────────────────────────────────────────────────────

export default function RegataPage() {
  const { activeVoyageId, regattas, addRegatta, deleteRegatta } = useStore()
  const [uploading, setUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(new Set())
  const [lightbox, setLightbox] = useState(null)
  const [pageImages, setPageImages] = useState({})
  // Setup dialog pro manuální nastavení počtu rozjížděk
  const [setupData, setSetupData] = useState(null) // { images, parsed, raceCount }
  const fileInputRef = useRef(null)

  const voyageRegattas = regattas.filter(r => r.voyageId === activeVoyageId)

  const toggle = (key) => setExpanded(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
  })

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') { setError('Vyberte PDF soubor.'); return }
    setError(''); setUploading(true)
    try {
      setUploadStep('Načítám PDF…')
      const { images, pageTexts } = await extractPdfData(file)
      setUploadStep('Zpracovávám…')
      const parsed = parseRegatta(pageTexts)

      if (parsed.autoDetected) {
        // Parser našel rozjížďky automaticky — rovnou uložit
        saveRegatta(parsed, images)
      } else {
        // Nezjistil počet — zobraz setup dialog
        setSetupData({ images, parsed, raceCount: Math.max(1, parsed.importantPageIndexes.length || 1) })
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false); setUploadStep('')
    }
  }

  const saveRegatta = (parsed, images, raceCountOverride) => {
    const races = raceCountOverride
      ? buildRacesFromCount(raceCountOverride, images, parsed.importantPageIndexes)
      : parsed.races
    const regattaId = crypto.randomUUID()
    addRegatta({ voyageId: activeVoyageId, id: regattaId, ...parsed, races })
    setPageImages(prev => ({ ...prev, [regattaId]: images }))
    setExpanded(new Set(races.map(r => `${regattaId}-${r.number}`)))
    setSetupData(null)
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
          <button className="btn-ocean flex items-center gap-1.5 text-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
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

      {/* Setup dialog — počet rozjížděk */}
      {setupData && (
        <div className="mb-6 card border-2 border-ocean-200 dark:border-ocean-700">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} className="text-ocean-500" />
            <span className="font-semibold text-navy-800 dark:text-white">{setupData.parsed.event}</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            PDF má {setupData.images.length} stran. Kolik rozjížděk je v programu?
          </p>
          <div className="flex items-center gap-4 mb-5">
            <button
              className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setSetupData(d => ({ ...d, raceCount: Math.max(1, d.raceCount - 1) }))}
            >
              <Minus size={16} />
            </button>
            <span className="text-3xl font-bold text-navy-800 dark:text-white w-12 text-center">
              {setupData.raceCount}
            </span>
            <button
              className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setSetupData(d => ({ ...d, raceCount: Math.min(20, d.raceCount + 1) }))}
            >
              <Plus size={16} />
            </button>
            <span className="text-sm text-slate-400">rozjížděk</span>
          </div>
          <div className="flex gap-2">
            <button className="btn-ocean flex-1" onClick={() => saveRegatta(setupData.parsed, setupData.images, setupData.raceCount)}>
              Vytvořit karty
            </button>
            <button className="btn-ghost px-4" onClick={() => setSetupData(null)}>
              Zrušit
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {voyageRegattas.length === 0 && !uploading && !setupData && (
        <div className="card border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Trophy size={40} className="text-slate-300 dark:text-slate-600" />
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300">Žádné regaty</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Nahraj závodní pokyny ve formátu PDF</p>
          </div>
          <button className="btn-ocean flex items-center gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Nahraj závodní pokyny (PDF)
          </button>
        </div>
      )}

      {/* Regatta list */}
      {voyageRegattas.map((regatta) => {
        const imgs = pageImages[regatta.id] ?? []
        return (
          <div key={regatta.id} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-lg text-navy-800 dark:text-white leading-tight">
                  {regatta.event || 'Regata'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[regatta.location, regatta.dates].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button className="btn-ghost p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => deleteRegatta(regatta.id)}>
                <Trash2 size={16} />
              </button>
            </div>

            {(regatta.races ?? []).map((race) => {
              const key = `${regatta.id}-${race.number}`
              const isOpen = expanded.has(key)
              const pageImg = imgs[race.pageIndex ?? 0] ?? imgs[0] ?? null

              return (
                <div key={key} className="card mb-3 overflow-hidden p-0">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    onClick={() => toggle(key)}
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ocean-500 text-white text-sm font-bold shrink-0">
                      {race.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy-800 dark:text-white text-sm">Rozjížďka {race.number}</p>
                      <div className="flex flex-wrap gap-x-3 mt-0.5">
                        {race.date && <span className="text-xs text-slate-500">{race.date}</span>}
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
                        {!race.date && !race.startTime && (
                          <span className="text-xs text-slate-400">Klikni pro zobrazení</span>
                        )}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-700">
                      {race.windNotes && (
                        <div className="px-4 py-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                          <Wind size={12} className="text-ocean-500 shrink-0" />
                          {race.windNotes}
                        </div>
                      )}
                      {pageImg ? (
                        <div className="relative group cursor-zoom-in" onClick={() => setLightbox(`data:image/jpeg;base64,${pageImg}`)}>
                          <img src={`data:image/jpeg;base64,${pageImg}`} alt={`Rozjížďka ${race.number}`} className="w-full block" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="bg-black/40 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ZoomIn size={20} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-6 text-center text-sm text-slate-400">Žádné schéma k dispozici</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}
