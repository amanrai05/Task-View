import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavItem = ({ icon, label, to, active, onClick }) => {
  const nav = useNavigate();
  return (
    <div
      className={`nav-item ${active ? 'active' : ''}`}
      onClick={onClick || (() => nav(to))}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
};

export default function Layout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const p = location.pathname;

  return (
    <div className="layout">
      <nav className="sidebar">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, paddingLeft: 4 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18 }}>TaskFlow</span>
        </div>

        {/* Nav */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 12 }}>
            Workspace
          </div>
          <NavItem icon="🏠" label="Dashboard" to="/dashboard" active={p === '/dashboard'} />
          <NavItem icon="📁" label="Projects" to="/projects" active={p.startsWith('/projects')} />

          {user?.role === 'admin' && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 8px', paddingLeft: 12 }}>
                Admin
              </div>
              <NavItem icon="👥" label="Users" to="/users" active={p === '/users'} />
            </>
          )}
        </div>

        {/* User */}
        <div style={{
          borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16
        }}>
          <div style={{ padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
            <span className={`badge badge-${user?.role}`} style={{ marginTop: 6 }}>{user?.role}</span>
          </div>
          <NavItem icon="🚪" label="Logout" onClick={() => { logout(); nav('/login'); }} />
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
