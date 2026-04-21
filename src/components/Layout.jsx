import { useEffect, useState } from 'react'
import { LogOut, Sun, Moon } from 'lucide-react'
import BottomNav from './BottomNav'
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

export default function Layout({ children, user }) {
  const [dark, setDark] = useDarkMode()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
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
    </div>
  )
}
