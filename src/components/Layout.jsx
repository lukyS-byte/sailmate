import { useEffect, useState } from 'react'
import { LogOut, Sun, Moon, WifiOff, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import BottomNav from './BottomNav'
import InstallPrompt from './InstallPrompt'
import { supabase } from '../lib/supabase'

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 text-white text-xs font-medium py-1.5 px-4">
          <WifiOff size={13} /> Offline — změny se uloží po obnovení připojení
        </div>
      )}
      {user && (
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 text-xs text-slate-400">
          <span className="truncate max-w-[180px]">{user.email}</span>
          <div className="flex items-center gap-3 ml-2 flex-shrink-0">
            <button
              onClick={() => setDark(d => !d)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <Link
              to="/account"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Účet"
            >
              <Settings size={14} />
            </Link>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-1 text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut size={13} /> Odhlásit
            </button>
          </div>
        </div>
      )}
      <main className="content-with-nav">
        {children}
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  )
}
