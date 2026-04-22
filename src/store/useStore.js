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
      regattas: [],
      activeVoyageId: null,

      // ── Voyage ──────────────────────────────────────────
      addVoyage: (data) => {
        const v = { ...data, id: uid(), createdAt: new Date().toISOString() }
        set((s) => ({ voyages: [...s.voyages, v], activeVoyageId: v.id }))
        return v.id
      },
      updateVoyage: (id, data) =>
        set((s) => ({ voyages: s.voyages.map((v) => (v.id === id ? { ...v, ...data } : v)) })),
      deleteVoyage: (id) =>
        set((s) => ({
          voyages: s.voyages.filter((v) => v.id !== id),
          expenses: s.expenses.filter((e) => e.voyageId !== id),
          waypoints: s.waypoints.filter((w) => w.voyageId !== id),
          supplies: s.supplies.filter((x) => x.voyageId !== id),
          logbook: s.logbook.filter((l) => l.voyageId !== id),
          regattas: s.regattas.filter((r) => r.voyageId !== id),
          activeVoyageId: s.activeVoyageId === id ? null : s.activeVoyageId,
        })),
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
        set((s) => ({ regattas: [...s.regattas, { createdAt: new Date().toISOString(), ...data, id: data.id ?? uid() }] })),
      deleteRegatta: (id) =>
        set((s) => ({ regattas: s.regattas.filter((r) => r.id !== id) })),
      updateRegatta: (id, data) =>
        set((s) => ({ regattas: s.regattas.map((r) => (r.id === id ? { ...r, ...data } : r)) })),
      updateRegattaMark: (regattaId, raceNumber, markOrder, coords) =>
        set((s) => ({
          regattas: s.regattas.map((r) => {
            if (r.id !== regattaId) return r
            return {
              ...r,
              races: r.races.map((race) => {
                if (race.number !== raceNumber) return race
                return {
                  ...race,
                  marks: race.marks.map((m) =>
                    (m.order ?? m.name) === (markOrder ?? m.name)
                      ? { ...m, lat: coords.lat, lng: coords.lng }
                      : m
                  ),
                }
              }),
            }
          }),
        })),
      getVoyageRegattas: (voyageId) => get().regattas.filter((r) => r.voyageId === voyageId),

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

      // ── Cloud sync helpers ───────────────────────────────
      importData: (data) =>
        set({
          voyages: data.voyages ?? [],
          expenses: data.expenses ?? [],
          waypoints: data.waypoints ?? [],
          supplies: data.supplies ?? [],
          logbook: data.logbook ?? [],
          regattas: data.regattas ?? [],
          activeVoyageId: data.activeVoyageId ?? null,
        }),
      clearData: () =>
        set({ voyages: [], expenses: [], waypoints: [], supplies: [], logbook: [], regattas: [], activeVoyageId: null }),
      getSnapshot: () => {
        const { voyages, expenses, waypoints, supplies, logbook, regattas, activeVoyageId } = get()
        return { voyages, expenses, waypoints, supplies, logbook, regattas, activeVoyageId }
      },
    }),
    { name: 'sailmate-v1' }
  )
)

export default useStore
