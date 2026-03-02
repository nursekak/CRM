import { Outlet, NavLink } from 'react-router-dom';
import { useUser } from './App';

const nav = [
  { to: '/', label: 'Дашборд' },
  { to: '/printers', label: 'Принтеры' },
  { to: '/consumables', label: 'Расходники' },
  { to: '/products', label: 'Изделия' },
  { to: '/warehouse', label: 'Склад' },
  { to: '/shipments', label: 'Отправка' },
];

export default function Layout({ onLogout }) {
  const user = useUser();
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 220,
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        padding: '20px 0',
      }}>
        <div style={{ padding: '0 16px 20px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 18 }}>CRM 3D</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Производство</div>
        </div>
        <nav>
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 16px',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: isActive ? 'rgba(245,158,11,0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                textDecoration: 'none',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.name || user?.email}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.role}</div>
          <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={onLogout}>
            Выйти
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
