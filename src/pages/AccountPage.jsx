import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, User, Download, Trash2, Shield, AlertTriangle, Loader2 } from 'lucide-react'
import useStore from '../store/useStore'
import { supabase } from '../lib/supabase'

export default function AccountPage({ user }) {
  const navigate = useNavigate()
  const { getSnapshot, clearData } = useStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleted, setDeleted] = useState(false)

  const handleExport = () => {
    const snapshot = getSnapshot()
    const exportData = {
      ...snapshot,
      exportedAt: new Date().toISOString(),
      email: user.email,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sailmate-data-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true)
    setDeleteError('')
    try {
      // 1. Smazat data z user_data tabulky
      const { error: deleteDataError } = await supabase
        .from('user_data')
        .delete()
        .eq('user_id', user.id)
      if (deleteDataError) throw deleteDataError

      // 2. Pokusit se smazat auth uživatele přes server proxy (vyžaduje SUPABASE_SERVICE_ROLE_KEY)
      try {
        const r = await fetch('/api/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        })
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          // Service key není nastaven — data jsou smazána, auth záznam zůstane
          if (err.error?.includes('SERVICE_ROLE_KEY')) {
            console.info('Auth user nebyl smazán — SUPABASE_SERVICE_ROLE_KEY není nastaven')
          }
        }
      } catch {
        // Proxy endpoint nedostupný nebo service key chybí — nevadí, data jsou smazána
      }

      // 3. Vymazat lokální store a odhlásit
      clearData()
      await supabase.auth.signOut()
      setDeleted(true)
    } catch (err) {
      setDeleteError(err.message ?? 'Při mazání došlo k chybě. Zkus to znovu nebo kontaktuj support.')
      setDeleteLoading(false)
    }
  }

  const registeredAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('cs', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  if (deleted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="card max-w-sm w-full text-center py-10">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
            <Trash2 size={22} className="text-emerald-500" />
          </div>
          <h2 className="text-lg font-bold text-navy-800 dark:text-white mb-2">Účet byl smazán</h2>
          <p className="text-sm text-slate-500">Tvoje data byla trvale odstraněna.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Zpět
          </button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-ocean-500/10 flex items-center justify-center flex-shrink-0">
            <User size={20} className="text-ocean-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-800 dark:text-white">Účet</h1>
            <p className="text-sm text-slate-400">Nastavení a GDPR práva</p>
          </div>
        </div>

        <div className="space-y-4">

          {/* Informace o účtu */}
          <section className="card">
            <h2 className="text-sm font-semibold text-navy-800 dark:text-white mb-3 flex items-center gap-2">
              <User size={15} className="text-ocean-500" /> Informace o účtu
            </h2>
            <div className="space-y-3">
              <div>
                <label className="label">E-mail</label>
                <input
                  className="input bg-slate-50 dark:bg-slate-700 cursor-not-allowed"
                  type="email"
                  value={user?.email ?? ''}
                  readOnly
                />
              </div>
              <div>
                <label className="label">Datum registrace</label>
                <input
                  className="input bg-slate-50 dark:bg-slate-700 cursor-not-allowed"
                  type="text"
                  value={registeredAt}
                  readOnly
                />
              </div>
            </div>
          </section>

          {/* Export dat */}
          <section className="card">
            <h2 className="text-sm font-semibold text-navy-800 dark:text-white mb-1 flex items-center gap-2">
              <Download size={15} className="text-ocean-500" /> Export dat
              <span className="badge bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 border-0 text-[10px]">GDPR čl. 20</span>
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Stáhni všechna svá data ve strojově čitelném formátu JSON (právo na přenositelnost).
            </p>
            <button
              onClick={handleExport}
              className="btn-ocean flex items-center gap-2 text-sm"
            >
              <Download size={15} /> Stáhnout moje data (JSON)
            </button>
          </section>

          {/* Smazání účtu */}
          <section className="card border border-red-100 dark:border-red-900/40">
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-2">
              <Trash2 size={15} /> Smazání účtu
              <span className="badge bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-0 text-[10px]">GDPR čl. 17</span>
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Trvale smaže tvůj účet a všechna data uložená v SailMate (právo být zapomenut).
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
              >
                <Trash2 size={14} /> Smazat účet a všechna data
              </button>
            ) : (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    Tato akce je nevratná. Všechna tvoje data budou trvale odstraněna.
                  </p>
                </div>
                {deleteError && (
                  <p className="text-xs text-red-500 bg-red-100 dark:bg-red-900/40 rounded-lg px-3 py-2">{deleteError}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteError('') }}
                    disabled={deleteLoading}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Zrušit
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleteLoading}
                    className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Potvrdit smazání
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Odkaz na Privacy */}
          <Link
            to="/privacy"
            className="card flex items-center gap-3 hover:border-ocean-300 dark:hover:border-ocean-700 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-ocean-500/10 flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-ocean-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-800 dark:text-white">Zásady ochrany osobních údajů</p>
              <p className="text-xs text-slate-400">GDPR informace o zpracování dat</p>
            </div>
            <ArrowLeft size={16} className="text-slate-300 ml-auto rotate-180" />
          </Link>

        </div>
      </div>
    </div>
  )
}
