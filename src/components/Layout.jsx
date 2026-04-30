import { useEffect, useState } from 'react'
import { LogOut, Sun, Moon, WifiOff, Settings, Users2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import BottomNav from './BottomNav'
import InstallPrompt from './InstallPrompt'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return [dark, setDark]
}

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

export default function Layout({ children, user }) {
  const [dark, setDark] = useDarkMode()
  const online = useOnlineStatus()
  const { crewMode, crewCode, exitCrewMode } = useStore()

  const leaveCrew = () => {
    if (!confirm('Opustit výpravu? Budeš odhlášen a data zmizí z tohoto zařízení (na cloudu zůstanou).')) return
    exitCrewMode()
    setTimeout(() => { window.location.href = '/' }, 150)
  }

  return (
    <div className="min-h-screen">
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-medium py-1.5 px-4 shadow-sm">
          <WifiOff size={13} /> Offline — změny se uloží po obnovení připojení
        </div>
      )}
      {crewMode ? (
        <div className="glass-bar flex items-center justify-between px-4 py-2.5 text-xs sticky top-0 z-40">
          <span className="flex items-center gap-2 text-purple-700 dark:text-purple-200 font-semibold">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-sm">
              <Users2 size={13} />
            </span>
            <span>Posádka · <span className="font-mono">{crewCode}</span></span>
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-lg text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              title={dark ? 'Světlý režim' : 'Tmavý režim'}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={leaveCrew}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-purple-600 dark:text-purple-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors font-medium"
            >
              <LogOut size={13} /> Opustit
            </button>
          </div>
        </div>
      ) : user && (
        <div className="glass-bar flex items-center justify-between px-4 py-2.5 text-xs sticky top-0 z-40">
          <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 min-w-0">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-500 text-white text-[10px] font-bold flex-shrink-0">
              {(user.email?.[0] ?? '?').toUpperCase()}
            </span>
            <span className="truncate font-medium">{user.email}</span>
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
              title={dark ? 'Světlý režim' : 'Tmavý režim'}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Link
              to="/account"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Účet"
            >
              <Settings size={15} />
            </Link>
            <button
              onClick={() => supabase.auth.signOut()}
              className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Odhlásit"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}
      <main className="content-with-nav animate-fade-in">
        {children}
        <div className="text-center text-[10px] text-slate-300 dark:text-slate-600 pt-6 pb-3 font-mono tracking-wider">
          build {typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev'}
        </div>
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  )
}
