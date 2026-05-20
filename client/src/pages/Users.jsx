import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { format, parseISO } from 'date-fns';

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const changeRole = async (id, role) => {
    if (id === user.id) return alert("Can't change your own role");
    await api.put(`/users/${id}/role`, { role });
    load();
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p>{users.length} registered users</p>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--accent-dim)', border: '1px solid rgba(124,92,252,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Syne'
                      }}>
                        {u.name[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                      {u.id === user.id && <span className="chip">You</span>}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{u.email}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {format(parseISO(u.created_at), 'MMM d, yyyy')}
                  </td>
                  <td>
                    {u.id !== user.id && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => changeRole(u.id, u.role === 'admin' ? 'member' : 'admin')}
                      >
                        Make {u.role === 'admin' ? 'Member' : 'Admin'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
