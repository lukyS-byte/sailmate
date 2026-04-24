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
import RegataPage from './pages/RegataPage'
import LogPage from './pages/LogPage'
import TrackPage from './pages/TrackPage'
import AuthPage from './pages/AuthPage'
import SharePage from './pages/SharePage'
import JoinPage from './pages/JoinPage'
import PrivacyPage from './pages/PrivacyPage'
import AccountPage from './pages/AccountPage'
import { CrewIdentityModal } from './components/RoleComponents'
import { supabase } from './lib/supabase'
import { publishSharedVoyage, loadSharedVoyage, subscribeSharedVoyage } from './lib/sharedSync'
import useStore from './store/useStore'

export default function App() {
  const [user, setUser] = useState(undefined)
  const [crewBooting, setCrewBooting] = useState(() => !!localStorage.getItem('sailmate-crew-code'))
  const saveTimer = useRef(null)
  const publishTimers = useRef({})
  const lastPayload = useRef({})          // last JSON per code (both directions — loop prevention)
  const subscriptions = useRef({})

  const crewMode = useStore((s) => s.crewMode)
  const crewMemberId = useStore((s) => s.crewMemberId)
  const voyages = useStore((s) => s.voyages)
  const crewCode = useStore((s) => s.crewCode)

  // ── Crew mode boot: načti snapshot, enter mode (subscribe přebírá hlavní efekt) ──
  useEffect(() => {
    const crewCode = localStorage.getItem('sailmate-crew-code')
    if (!crewCode) return
    const { enterCrewMode, mergeSharedVoyage, exitCrewMode } = useStore.getState()
    ;(async () => {
      const row = await loadSharedVoyage(crewCode)
      if (!row?.voyage_data) {
        exitCrewMode()
        setCrewBooting(false)
        return
      }
      lastPayload.current[crewCode] = JSON.stringify(row.voyage_data)
      enterCrewMode(crewCode)
      mergeSharedVoyage(row.voyage_data)
      setCrewBooting(false)
    })()
  }, [])

  // ── Kapitán: Supabase auth ────────────────────────────────────────────────
  const loadUserData = async (userId) => {
    const { data } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.data) useStore.getState().importData(data.data)
  }

  const saveUserData = async (userId) => {
    const snapshot = useStore.getState().getSnapshot()
    await supabase.from('user_data').upsert({
      user_id: userId,
      data: snapshot,
      updated_at: new Date().toISOString(),
    })
  }

  useEffect(() => {
    if (localStorage.getItem('sailmate-crew-code')) {
      setUser(null)  // crew mode → neřeš Supabase session
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadUserData(u.id)
        // Idempotentně zajistí Storage bucket pro regattové obrázky
        // (jednou za session — server-side, neblokuje UI)
        fetch('/api/ensure-bucket', { method: 'POST' }).catch(() => {})
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (event === 'SIGNED_IN') {
        await loadUserData(u.id)
        fetch('/api/ensure-bucket', { method: 'POST' }).catch(() => {})
      }
      else if (event === 'SIGNED_OUT' && !localStorage.getItem('sailmate-crew-code')) {
        useStore.getState().clearData()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Auto-sync: publish + Realtime subscribe per shared voyage ─────────────
  useEffect(() => {
    if (!user && !crewMode) return

    const schedulePublish = (code, snapshot) => {
      clearTimeout(publishTimers.current[code])
      publishTimers.current[code] = setTimeout(() => {
        const payloadStr = JSON.stringify(snapshot)
        if (lastPayload.current[code] === payloadStr) return
        lastPayload.current[code] = payloadStr
        publishSharedVoyage(code, snapshot, user?.id ?? null)
      }, 1500)
    }

    const reconcileSubs = () => {
      const s = useStore.getState()
      const codes = new Set(
        (s.voyages ?? []).filter((v) => v.inviteCode).map((v) => v.inviteCode)
      )
      if (s.crewMode && s.crewCode) codes.add(s.crewCode)

      for (const code of codes) {
        if (!subscriptions.current[code]) {
          subscriptions.current[code] = subscribeSharedVoyage(code, (incoming) => {
            const incomingStr = JSON.stringify(incoming)
            if (lastPayload.current[code] === incomingStr) return
            lastPayload.current[code] = incomingStr
            useStore.getState().mergeSharedVoyage(incoming)
          })
        }
      }
      for (const code of Object.keys(subscriptions.current)) {
        if (!codes.has(code)) {
          subscriptions.current[code]?.()
          delete subscriptions.current[code]
        }
      }
    }

    reconcileSubs()

    const unsub = useStore.subscribe((state) => {
      reconcileSubs()
      for (const v of state.voyages ?? []) {
        if (!v.inviteCode) continue
        const snapshot = state.getVoyageSnapshot(v.id)
        if (snapshot) schedulePublish(v.inviteCode, snapshot)
      }
      if (user && !state.crewMode) {
        clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => saveUserData(user.id), 2000)
      }
    })

    return () => {
      unsub()
      clearTimeout(saveTimer.current)
      Object.values(publishTimers.current).forEach((t) => clearTimeout(t))
      Object.values(subscriptions.current).forEach((u) => u?.())
      subscriptions.current = {}
    }
  }, [user, crewMode])

  // Public pages — no auth required
  if (window.location.pathname.startsWith('/share/')) {
    return <Routes><Route path="/share/:token" element={<SharePage />} /></Routes>
  }
  if (window.location.pathname === '/privacy') {
    return <Routes><Route path="/privacy" element={<PrivacyPage />} /></Routes>
  }

  if (crewBooting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 to-ocean-700 flex items-center justify-center">
        <Loader2 size={32} className="text-white animate-spin" />
      </div>
    )
  }

  if (!crewMode) {
    if (user === undefined) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-navy-900 to-ocean-700 flex items-center justify-center">
          <Loader2 size={32} className="text-white animate-spin" />
        </div>
      )
    }
    if (!user) return <AuthPage />
  }

  // Crew bez identity — najdi výpravu podle kódu a zobraz modal "Kdo jsi?"
  const crewVoyage = crewMode ? voyages.find((v) => v.inviteCode === crewCode) : null
  const needsIdentity = crewMode && !crewMemberId && crewVoyage

  return (
    <Layout user={user}>
      {needsIdentity && (
        <CrewIdentityModal voyage={crewVoyage} onSelected={() => {}} />
      )}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/voyage" element={<VoyagePage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/route" element={<RoutePage />} />
        <Route path="/supplies" element={<SuppliesPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/regata" element={<RegataPage />} />
        <Route path="/log" element={<LogPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/account" element={<AccountPage user={user} />} />
      </Routes>
    </Layout>
  )
}
