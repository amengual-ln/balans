import { NavLink } from 'react-router-dom';
import { ArrowLeftRight, Building2, CreditCard, Landmark, RefreshCw } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/movements', label: 'Movimientos', Icon: ArrowLeftRight },
  { to: '/accounts', label: 'Cuentas', Icon: Building2 },
  { to: '/cards', label: 'Tarjetas', Icon: CreditCard },
  { to: '/debts', label: 'Deudas', Icon: Landmark },
  { to: '/subscriptions', label: 'Suscripciones', Icon: RefreshCw },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white">
      <div className="mx-auto flex max-w-2xl">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
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
        ))}
      </div>
    </nav>
  );
}
