import { NavLink } from 'react-router-dom'
import { Home, Anchor, Wallet, Map, ShoppingCart, BookOpen } from 'lucide-react'

const tabs = [
  { to: '/', icon: Home, label: 'Přehled' },
  { to: '/voyage', icon: Anchor, label: 'Výprava' },
  { to: '/expenses', icon: Wallet, label: 'Náklady' },
  { to: '/route', icon: Map, label: 'Trasa' },
  { to: '/supplies', icon: ShoppingCart, label: 'Zásoby' },
  { to: '/log', icon: BookOpen, label: 'Deník' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50">
      <div className="flex items-stretch h-16">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-ocean-600' : 'text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
