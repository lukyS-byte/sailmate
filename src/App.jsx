import { useState, useEffect, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import VoyagePage from './pages/VoyagePage'
import ExpensesPage from './pages/ExpensesPage'
import RoutePage from './pages/RoutePage'
import SuppliesPage from './pages/SuppliesPage'
import ToolsPage from './pages/ToolsPage'
import LogPage from './pages/LogPage'
import AuthPage from './pages/AuthPage'
import SharePage from './pages/SharePage'
import { supabase } from './lib/supabase'
import useStore from './store/useStore'

export default function App() {
  const [user, setUser] = useState(undefined)
  const saveTimer = useRef(null)
  const { importData, clearData, getSnapshot } = useStore()

  const loadUserData = async (userId) => {
    const { data } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.data) importData(data.data)
  }

  const saveUserData = async (userId) => {
    const snapshot = getSnapshot()
    await supabase.from('user_data').upsert({
      user_id: userId,
      data: snapshot,
      updated_at: new Date().toISOString(),
    })
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadUserData(u.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (event === 'SIGNED_IN') {
        await loadUserData(u.id)
      } else if (event === 'SIGNED_OUT') {
        clearData()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    const unsub = useStore.subscribe(() => {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveUserData(user.id), 2000)
    })
    return () => {
      unsub()
      clearTimeout(saveTimer.current)
    }
  }, [user])

  // Public share page — no auth required
  if (window.location.pathname.startsWith('/share/')) {
    return (
      <Routes>
        <Route path="/share/:token" element={<SharePage />} />
      </Routes>
    )
  }

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 to-ocean-700 flex items-center justify-center">
        <Loader2 size={32} className="text-white animate-spin" />
      </div>
    )
  }

  if (!user) return <AuthPage />

  return (
    <Layout user={user}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/voyage" element={<VoyagePage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/route" element={<RoutePage />} />
        <Route path="/supplies" element={<SuppliesPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/log" element={<LogPage />} />
        <Route path="/share/:token" element={<SharePage />} />
      </Routes>
    </Layout>
  )
}
