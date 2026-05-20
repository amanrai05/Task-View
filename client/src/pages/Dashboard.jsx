import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { format, isPast, parseISO } from 'date-fns';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    api.get('/users/dashboard')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const { taskStats, myTasks, overdueTasks, myProjects } = data;
  const completePct = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Good {getGreeting()}, {user.name.split(' ')[0]} 👋</h1>
          <p>Here's what's happening in your workspace</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {[
          { label: 'Total Tasks', value: taskStats.total, color: 'var(--text)' },
          { label: 'To Do', value: taskStats.todo, color: 'var(--text-dim)' },
          { label: 'In Progress', value: taskStats.in_progress, color: 'var(--accent)' },
          { label: 'Completed', value: taskStats.done, color: 'var(--success)' },
          { label: 'Overdue', value: taskStats.overdue, color: 'var(--danger)' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="label">{s.label}</div>
            <div className="value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      {taskStats.total > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Overall Progress</span>
            <span style={{ fontSize: 14, color: 'var(--accent)', fontFamily: 'Syne', fontWeight: 700 }}>{completePct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${completePct}%` }} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', borderColor: 'rgba(255,71,87,0.3)' }}>
            <h3 style={{ marginBottom: 16, color: 'var(--danger)', fontSize: 15 }}>
              🚨 Overdue Tasks ({overdueTasks.length})
            </h3>
            {overdueTasks.map(t => (
              <div
                key={t.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer'
                }}
                onClick={() => nav(`/projects/${t.project_id}`)}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.project_name}</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--danger)' }}>
                  Due {format(parseISO(t.due_date), 'MMM d')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* My Tasks */}
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>My Tasks</h3>
          {myTasks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No tasks assigned yet</p>
          ) : (
            myTasks.slice(0, 6).map(t => (
              <div
                key={t.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid rgba(42,42,58,0.5)', cursor: 'pointer'
                }}
                onClick={() => nav(`/projects/${t.project_id}`)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.project_name}</div>
                </div>
                <span className={`badge badge-${t.status}`} style={{ marginLeft: 8, flexShrink: 0 }}>{statusLabel[t.status]}</span>
              </div>
            ))
          )}
        </div>

        {/* My Projects */}
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>Projects</h3>
          {myProjects.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No projects yet</p>
          ) : (
            myProjects.map(p => {
              const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
              return (
                <div
                  key={p.id}
                  style={{ padding: '10px 0', borderBottom: '1px solid rgba(42,42,58,0.5)', cursor: 'pointer' }}
                  onClick={() => nav(`/projects/${p.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.task_count} tasks</span>
                  </div>
                  <div className="progress-bar" style={{ height: 4 }}>
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
