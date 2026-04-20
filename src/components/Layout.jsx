import BottomNav from './BottomNav'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="content-with-nav pt-safe">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
