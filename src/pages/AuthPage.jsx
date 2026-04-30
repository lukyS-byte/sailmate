import { useState } from 'react'
import { Anchor, Mail, Lock, Loader2, KeyRound, Users2, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [gdprConsent, setGdprConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'register') {
        // Ověř invite kód před registrací
        const r = await fetch('/api/check-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: inviteCode }),
        })
        if (!r.ok) {
          const data = await r.json().catch(() => ({}))
          throw new Error(data.error ?? 'Nesprávný přístupový kód.')
        }
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Zkontroluj svůj e-mail a potvrď registraci.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      const msgs = {
        'Invalid login credentials': 'Špatný e-mail nebo heslo.',
        'Email not confirmed': 'Nejprve potvrď svůj e-mail.',
        'User already registered': 'Tento e-mail je již registrován.',
        'Password should be at least 6 characters': 'Heslo musí mít alespoň 6 znaků.',
      }
      setError(msgs[err.message] ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-ocean-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Anchor size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SailMate</h1>
          <p className="text-blue-200 text-sm mt-1">Tvůj lodní deník v kapse</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${mode === 'login' ? 'bg-white shadow text-navy-800' : 'text-slate-500'}`}
            >
              Přihlásit se
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccess('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${mode === 'register' ? 'bg-white shadow text-navy-800' : 'text-slate-500'}`}
            >
              Registrovat
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  type="email"
                  placeholder="kapitan@more.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Heslo</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  type="password"
                  placeholder={mode === 'register' ? 'Alespoň 6 znaků' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="label">Přístupový kód</label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input pl-9"
                      type="text"
                      placeholder="Kód od kapitána"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      required
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Registrace je pouze pro pozvané uživatele.</p>
                </div>

                <div className="flex items-start gap-2.5">
                  <input
                    id="gdpr-consent"
                    type="checkbox"
                    checked={gdprConsent}
                    onChange={(e) => setGdprConsent(e.target.checked)}
                    required
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-ocean-500 flex-shrink-0 cursor-pointer"
                  />
                  <label htmlFor="gdpr-consent" className="text-xs text-slate-500 leading-relaxed cursor-pointer">
                    Souhlasím se{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ocean-500 hover:underline font-medium"
                    >
                      zpracováním osobních údajů
                    </a>{' '}
                    dle GDPR
                  </label>
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-sm text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">{success}</p>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'register' && !gdprConsent)}
              className="btn-ocean w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'login' ? 'Přihlásit se' : 'Vytvořit účet'}
            </button>
          </form>
        </div>

        {/* Crew entry */}
        <div className="mt-5 text-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/15" />
            <span className="text-[11px] uppercase tracking-wider text-blue-200/70 font-semibold">nebo</span>
            <div className="flex-1 h-px bg-white/15" />
          </div>
          <a
            href="/join"
            className="group inline-flex items-center justify-between gap-3 w-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3.5 text-white font-medium text-sm transition-all"
          >
            <span className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg shadow-purple-500/30">
                <Users2 size={17} />
              </span>
              <span className="text-left">
                <span className="block leading-tight">Vstoupit jako posádka</span>
                <span className="block text-[11px] text-blue-200/80 leading-tight font-normal">stačí kód od kapitána</span>
              </span>
            </span>
            <ArrowRight size={16} className="text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </a>
        </div>
      </div>
    </div>
  )
}
