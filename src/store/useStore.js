import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const uid = () => crypto.randomUUID()

const useStore = create(
  persist(
    (set, get) => ({
      voyages: [],
      expenses: [],
      waypoints: [],
      supplies: [],
      logbook: [],
      logDays: [],       // Nový klasický lodní deník — stránky po dnech
      regattas: [],
      tracks: [],        // GPS tracky { id, voyageId, startedAt, endedAt, points, intervalSec, name }
      activeTrackId: null,
      activeVoyageId: null,

      // ── Crew mode (posádka přihlášená přes kód) ─────────
      crewMode: false,
      crewCode: null,
      crewMemberId: null,  // který člen posádky jsem (když jsem crew)

      // ── Voyage ──────────────────────────────────────────
      addVoyage: (data) => {
        if (get().crewMode) return null  // posádka nesmí zakládat nové výpravy
        const v = { ...data, id: uid(), createdAt: new Date().toISOString() }
        set((s) => ({ voyages: [...s.voyages, v], activeVoyageId: v.id }))
        return v.id
      },
      updateVoyage: (id, data) =>
        set((s) => ({ voyages: s.voyages.map((v) => (v.id === id ? { ...v, ...data } : v)) })),
      deleteVoyage: (id) => {
        if (get().crewMode) return  // posádka nesmí mazat výpravu
        set((s) => ({
          voyages: s.voyages.filter((v) => v.id !== id),
          expenses: s.expenses.filter((e) => e.voyageId !== id),
          waypoints: s.waypoints.filter((w) => w.voyageId !== id),
          supplies: s.supplies.filter((x) => x.voyageId !== id),
          logbook: s.logbook.filter((l) => l.voyageId !== id),
          regattas: s.regattas.filter((r) => r.voyageId !== id),
          activeVoyageId: s.activeVoyageId === id ? null : s.activeVoyageId,
        }))
      },
      setActiveVoyage: (id) => set({ activeVoyageId: id }),
      getActiveVoyage: () => {
        const { voyages, activeVoyageId } = get()
        return voyages.find((v) => v.id === activeVoyageId) ?? null
      },

      // ── Crew (stored inside voyage) ─────────────────────
      addCrewMember: (voyageId, member) =>
        set((s) => ({
          voyages: s.voyages.map((v) =>
            v.id === voyageId
              ? { ...v, crew: [...(v.crew ?? []), { ...member, id: uid() }] }
              : v
          ),
        })),
      removeCrewMember: (voyageId, memberId) =>
        set((s) => ({
          voyages: s.voyages.map((v) =>
            v.id === voyageId
              ? { ...v, crew: v.crew.filter((c) => c.id !== memberId) }
              : v
          ),
        })),

      // ── Role / funkce ────────────────────────────────────
      // Kapitán přidělí nebo odebere roli. Role je buď string id
      // ("captain", "cook"…) nebo objekt { id: "custom:…", label }.
      assignRole: (voyageId, memberId, role) =>
        set((s) => ({
          voyages: s.voyages.map((v) => {
            if (v.id !== voyageId) return v
            return {
              ...v,
              crew: (v.crew ?? []).map((c) => {
                if (c.id !== memberId) return c
                const roles = c.roles ?? []
                const roleId = typeof role === 'string' ? role : role.id
                if (roles.some((r) => (typeof r === 'string' ? r : r.id) === roleId)) return c
                return { ...c, roles: [...roles, role] }
              }),
            }
          }),
        })),
      removeRole: (voyageId, memberId, roleId) =>
        set((s) => ({
          voyages: s.voyages.map((v) => {
            if (v.id !== voyageId) return v
            return {
              ...v,
              crew: (v.crew ?? []).map((c) =>
                c.id === memberId
                  ? { ...c, roles: (c.roles ?? []).filter((r) => (typeof r === 'string' ? r : r.id) !== roleId) }
                  : c
              ),
            }
          }),
        })),

      // Posádka žádá o roli. Vytvoří záznam ve voyage.roleRequests.
      requestRole: (voyageId, memberId, role) => {
        const reqId = uid()
        set((s) => ({
          voyages: s.voyages.map((v) =>
            v.id === voyageId
              ? {
                  ...v,
                  roleRequests: [
                    ...(v.roleRequests ?? []),
                    { id: reqId, memberId, role, createdAt: new Date().toISOString() },
                  ],
                }
              : v
          ),
        }))
        return reqId
      },
      // Kapitán schválí → role se přidá členovi, žádost se smaže.
      approveRoleRequest: (voyageId, requestId) =>
        set((s) => ({
          voyages: s.voyages.map((v) => {
            if (v.id !== voyageId) return v
            const req = (v.roleRequests ?? []).find((r) => r.id === requestId)
            if (!req) return v
            const roleId = typeof req.role === 'string' ? req.role : req.role.id
            return {
              ...v,
              crew: (v.crew ?? []).map((c) => {
                if (c.id !== req.memberId) return c
                const roles = c.roles ?? []
                if (roles.some((r) => (typeof r === 'string' ? r : r.id) === roleId)) return c
                return { ...c, roles: [...roles, req.role] }
              }),
              roleRequests: (v.roleRequests ?? []).filter((r) => r.id !== requestId),
            }
          }),
        })),
      rejectRoleRequest: (voyageId, requestId) =>
        set((s) => ({
          voyages: s.voyages.map((v) =>
            v.id === voyageId
              ? { ...v, roleRequests: (v.roleRequests ?? []).filter((r) => r.id !== requestId) }
              : v
          ),
        })),

      // ── Crew identity ───────────────────────────────────
      setCrewMemberId: (memberId) => {
        localStorage.setItem('sailmate-crew-member-id', memberId)
        set({ crewMemberId: memberId })
      },
      clearCrewMemberId: () => {
        localStorage.removeItem('sailmate-crew-member-id')
        set({ crewMemberId: null })
      },

      // ── Expenses ────────────────────────────────────────
      addExpense: (data) =>
        set((s) => ({ expenses: [...s.expenses, { ...data, id: uid(), createdAt: new Date().toISOString() }] })),
      updateExpense: (id, data) =>
        set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...data } : e)) })),
      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
      getVoyageExpenses: (voyageId) => get().expenses.filter((e) => e.voyageId === voyageId),

      // ── Waypoints ───────────────────────────────────────
      addWaypoint: (data) =>
        set((s) => {
          const order = s.waypoints.filter((w) => w.voyageId === data.voyageId).length
          return { waypoints: [...s.waypoints, { ...data, id: uid(), order }] }
        }),
      updateWaypoint: (id, data) =>
        set((s) => ({ waypoints: s.waypoints.map((w) => (w.id === id ? { ...w, ...data } : w)) })),
      deleteWaypoint: (id) =>
        set((s) => ({ waypoints: s.waypoints.filter((w) => w.id !== id) })),
      reorderWaypoints: (voyageId, ids) =>
        set((s) => ({
          waypoints: s.waypoints.map((w) =>
            w.voyageId === voyageId ? { ...w, order: ids.indexOf(w.id) } : w
          ),
        })),
      getVoyageWaypoints: (voyageId) =>
        get()
          .waypoints.filter((w) => w.voyageId === voyageId)
          .sort((a, b) => a.order - b.order),

      // ── Supplies ────────────────────────────────────────
      addSupply: (data) =>
        set((s) => ({ supplies: [...s.supplies, { ...data, id: uid(), checked: false }] })),
      toggleSupply: (id) =>
        set((s) => ({
          supplies: s.supplies.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x)),
        })),
      deleteSupply: (id) =>
        set((s) => ({ supplies: s.supplies.filter((x) => x.id !== id) })),
      getVoyageSupplies: (voyageId) => get().supplies.filter((x) => x.voyageId === voyageId),


      // ── Regattas ────────────────────────────────────────
      addRegatta: (data) =>
        set((s) => ({ regattas: [...s.regattas, { ...data, id: data.id ?? uid(), createdAt: new Date().toISOString() }] })),
      deleteRegatta: (id) => {
        if (get().crewMode) return  // posádka nesmí mazat závodní pokyny
        set((s) => ({ regattas: s.regattas.filter((r) => r.id !== id) }))
      },

      // ── Tracks (GPS tracking) ───────────────────────────
      startTrack: (voyageId, intervalSec = 900) => {
        const id = uid()
        const track = {
          id,
          voyageId: voyageId ?? null,
          startedAt: new Date().toISOString(),
          endedAt: null,
          intervalSec,
          points: [],
          name: `Plavba ${new Date().toLocaleString('cs', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        }
        set((s) => ({ tracks: [...s.tracks, track], activeTrackId: id }))
        return id
      },
      addTrackPoint: (id, point) =>
        set((s) => ({
          tracks: s.tracks.map((t) =>
            t.id === id ? { ...t, points: [...t.points, point] } : t
          ),
        })),
      stopTrack: (id) =>
        set((s) => ({
          tracks: s.tracks.map((t) =>
            t.id === id ? { ...t, endedAt: new Date().toISOString() } : t
          ),
          activeTrackId: s.activeTrackId === id ? null : s.activeTrackId,
        })),
      updateTrack: (id, data) =>
        set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...data } : t)) })),
      deleteTrack: (id) =>
        set((s) => ({
          tracks: s.tracks.filter((t) => t.id !== id),
          activeTrackId: s.activeTrackId === id ? null : s.activeTrackId,
        })),
      getVoyageTracks: (voyageId) =>
        get().tracks.filter((t) => t.voyageId === voyageId).sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? '')),
      getActiveTrack: () => {
        const { tracks, activeTrackId } = get()
        return tracks.find((t) => t.id === activeTrackId) ?? null
      },

      // ── LogDays (klasický lodní deník) ──────────────────
      addLogDay: (data) =>
        set((s) => ({ logDays: [...s.logDays, { id: uid(), rows: [], watches: [], ...data }] })),
      updateLogDay: (id, data) =>
        set((s) => ({ logDays: s.logDays.map((d) => (d.id === id ? { ...d, ...data } : d)) })),
      deleteLogDay: (id) =>
        set((s) => ({ logDays: s.logDays.filter((d) => d.id !== id) })),
      getVoyageLogDays: (voyageId) =>
        get().logDays.filter((d) => d.voyageId === voyageId).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),

      // ── Logbook ─────────────────────────────────────────
      addLogEntry: (data) =>
        set((s) => ({
          logbook: [...s.logbook, { ...data, id: uid(), timestamp: data.timestamp ?? new Date().toISOString() }],
        })),
      deleteLogEntry: (id) =>
        set((s) => ({ logbook: s.logbook.filter((l) => l.id !== id) })),
      getVoyageLog: (voyageId) =>
        get()
          .logbook.filter((l) => l.voyageId === voyageId)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),

      // ── Crew mode ───────────────────────────────────────
      enterCrewMode: (code) => {
        localStorage.setItem('sailmate-crew-code', code)
        const memberId = localStorage.getItem('sailmate-crew-member-id')
        set({ crewMode: true, crewCode: code, crewMemberId: memberId ?? null })
      },
      exitCrewMode: () => {
        localStorage.removeItem('sailmate-crew-code')
        localStorage.removeItem('sailmate-crew-member-id')
        set({
          crewMode: false, crewCode: null, crewMemberId: null,
          voyages: [], expenses: [], waypoints: [], supplies: [], logbook: [],
          logDays: [], regattas: [], tracks: [], activeTrackId: null, activeVoyageId: null,
        })
      },

      // Nahraď data jedné sdílené výpravy (pro captain i crew)
      // snapshot = { voyage, expenses, waypoints, supplies, logDays, tracks, regattas }
      mergeSharedVoyage: (snapshot) => {
        if (!snapshot?.voyage) return
        const vId = snapshot.voyage.id
        set((s) => {
          // Zachovej lokální pageData u regat (stripped ze snapshotu kvůli velikosti)
          const localPageDataById = Object.fromEntries(
            s.regattas.filter((r) => r.pageData).map((r) => [r.id, r.pageData])
          )
          const incomingRegattas = (snapshot.regattas ?? []).map((r) => ({
            ...r,
            pageData: localPageDataById[r.id] ?? r.pageData,
          }))
          return {
            voyages: [snapshot.voyage, ...s.voyages.filter((v) => v.id !== vId)],
            expenses: [...s.expenses.filter((e) => e.voyageId !== vId), ...(snapshot.expenses ?? [])],
            waypoints: [...s.waypoints.filter((w) => w.voyageId !== vId), ...(snapshot.waypoints ?? [])],
            supplies: [...s.supplies.filter((x) => x.voyageId !== vId), ...(snapshot.supplies ?? [])],
            logDays: [...s.logDays.filter((d) => d.voyageId !== vId), ...(snapshot.logDays ?? [])],
            tracks: [...s.tracks.filter((t) => t.voyageId !== vId), ...(snapshot.tracks ?? [])],
            regattas: [...s.regattas.filter((r) => r.voyageId !== vId), ...incomingRegattas],
            activeVoyageId: s.activeVoyageId ?? vId,
          }
        })
      },

      // Vytáhni data jedné výpravy jako snapshot pro publikování do voyage_invites.
      // pageData (base64 obrázky) není v snapshotu — obrázky se nahrávají do
      // Supabase Storage, v JSONB jsou jen pageUrls.
      getVoyageSnapshot: (voyageId) => {
        const s = get()
        const voyage = s.voyages.find((v) => v.id === voyageId)
        if (!voyage) return null
        return {
          voyage,
          expenses: s.expenses.filter((e) => e.voyageId === voyageId),
          waypoints: s.waypoints.filter((w) => w.voyageId === voyageId),
          supplies: s.supplies.filter((x) => x.voyageId === voyageId),
          logDays: s.logDays.filter((d) => d.voyageId === voyageId),
          tracks: s.tracks.filter((t) => t.voyageId === voyageId),
          regattas: s.regattas
            .filter((r) => r.voyageId === voyageId)
            .map(({ pageData, ...r }) => r),  // odstraň lokální base64 cache
        }
      },

      // ── Cloud sync helpers ───────────────────────────────
      importData: (data) =>
        set({
          voyages: data.voyages ?? [],
          regattas: data.regattas ?? [],
          expenses: data.expenses ?? [],
          waypoints: data.waypoints ?? [],
          supplies: data.supplies ?? [],
          logbook: data.logbook ?? [],
          logDays: data.logDays ?? [],
          tracks: data.tracks ?? [],
          activeTrackId: data.activeTrackId ?? null,
          activeVoyageId: data.activeVoyageId ?? null,
        }),
      clearData: () =>
        set({ voyages: [], expenses: [], waypoints: [], supplies: [], logbook: [], logDays: [], regattas: [], tracks: [], activeTrackId: null, activeVoyageId: null }),
      getSnapshot: () => {
        const { voyages, expenses, waypoints, supplies, logbook, logDays, regattas, tracks, activeTrackId, activeVoyageId } = get()
        return { voyages, expenses, waypoints, supplies, logbook, logDays, regattas, tracks, activeTrackId, activeVoyageId }
      },
    }),
    {
      name: 'sailmate-v1',
      // Do localStorage neukládat těžká data (obrázky PDF stránek v regatách)
      // — ty jdou jen do Supabase cloudu. localStorage má na iOS limit ~5 MB.
      partialize: (state) => ({
        ...state,
        regattas: (state.regattas ?? []).map(({ pageData, ...r }) => r),
      }),
    }
  )
)

export default useStore
