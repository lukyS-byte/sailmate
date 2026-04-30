import { NavLink } from 'react-router-dom'
import { Home, Anchor, Wallet, Map, BookOpen, Trophy, Wind } from 'lucide-react'

const tabs = [
  { to: '/', icon: Home, label: 'Přehled' },
  { to: '/voyage', icon: Anchor, label: 'Výprava' },
  { to: '/route', icon: Map, label: 'Trasa' },
  { to: '/weather', icon: Wind, label: 'Počasí' },
  { to: '/expenses', icon: Wallet, label: 'Náklady' },
  { to: '/log', icon: BookOpen, label: 'Deník' },
  { to: '/regata', icon: Trophy, label: 'Regata' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-nav pb-safe z-50">
      <div className="flex items-stretch h-16 max-w-3xl mx-auto px-1">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 relative
               transition-colors duration-200 ${
                 isActive
                   ? 'text-ocean-500'
                   : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
               }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full
                               bg-gradient-to-r from-ocean-400 to-ocean-500"
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className={isActive ? 'drop-shadow-[0_2px_6px_rgba(14,165,233,0.4)]' : ''}
                />
                <span className="text-[10px] font-medium leading-none tracking-tight">
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
