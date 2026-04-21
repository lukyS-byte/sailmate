import { LogOut } from 'lucide-react'
import BottomNav from './BottomNav'
import { supabase } from '../lib/supabase'

export default function Layout({ children, user }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {user && (
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-100 text-xs text-slate-400">
          <span className="truncate max-w-[220px]">{user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1 text-slate-400 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
          >
            <LogOut size={13} /> Odhlásit
          </button>
        </div>
      )}
      <main className="content-with-nav">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
