import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowLeftRight, Building2, CreditCard, MoreVertical, Landmark, RefreshCw, TrendingUp } from 'lucide-react';

const PRIMARY_ITEMS = [
  { to: '/movements', label: 'Movimientos', Icon: ArrowLeftRight },
  { to: '/accounts', label: 'Cuentas', Icon: Building2 },
  { to: '/cards', label: 'Tarjetas', Icon: CreditCard },
];

const OVERFLOW_ITEMS = [
  { to: '/debts', label: 'Deudas', Icon: Landmark },
  { to: '/subscriptions', label: 'Suscripciones', Icon: RefreshCw },
  { to: '/investments', label: 'Inversiones', Icon: TrendingUp },
];

function NavItem({ to, label, Icon }: typeof PRIMARY_ITEMS[0]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
          isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white">
      <div className="mx-auto flex max-w-2xl">
        {PRIMARY_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {/* Overflow Menu */}
        <div className="relative flex flex-1 flex-col items-center">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full py-3 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <MoreVertical className="mx-auto h-5 w-5" />
            <span className="block">Más</span>
          </button>

          {menuOpen && (
            <div className="absolute bottom-full right-0 mb-1 min-w-[160px] rounded-lg border border-border bg-white shadow-lg">
              {OVERFLOW_ITEMS.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-surface text-primary font-medium'
                        : 'text-text-primary hover:bg-surface'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
