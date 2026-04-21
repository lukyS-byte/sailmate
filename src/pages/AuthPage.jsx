import { useState } from 'react'
import { Anchor, Mail, Lock, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
                  placeholder="kapitan@moře.cz"
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

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-sm text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">{success}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-ocean w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'login' ? 'Přihlásit se' : 'Vytvořit účet'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
