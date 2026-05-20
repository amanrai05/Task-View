import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { format, parseISO } from 'date-fns';

const STATUSES = ['todo', 'in_progress', 'done'];
const STATUS_LABEL = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const PRIORITIES = ['low', 'medium', 'high'];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tasks');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');
  const [filter, setFilter] = useState({ status: '', priority: '' });

  const loadProject = useCallback(() =>
    api.get(`/projects/${id}`).then(r => setProject(r.data)), [id]);

  const loadTasks = useCallback(() => {
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.priority) params.set('priority', filter.priority);
    return api.get(`/projects/${id}/tasks?${params}`).then(r => setTasks(r.data));
  }, [id, filter]);

  useEffect(() => {
    Promise.all([loadProject(), loadTasks()]).finally(() => setLoading(false));
  }, [loadProject, loadTasks]);

  const isAdmin = user.role === 'admin' ||
    project?.owner_id === user.id ||
    project?.members?.find(m => m.id === user.id && m.project_role === 'admin');

  const deleteTask = async taskId => {
    if (!window.confirm('Delete this task?')) return;
    await api.delete(`/projects/${id}/tasks/${taskId}`);
    loadTasks();
  };

  const deleteProject = async () => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    await api.delete(`/projects/${id}`);
    nav('/projects');
  };

  const removeMember = async userId => {
    if (!window.confirm('Remove this member?')) return;
    await api.delete(`/projects/${id}/members/${userId}`);
    loadProject();
  };

  const addMember = async e => {
    e.preventDefault();
    setMemberError(''); setMemberSuccess('');
    try {
      await api.post(`/projects/${id}/members`, { email: memberEmail, role: memberRole });
      setMemberSuccess('Member added!');
      setMemberEmail('');
      loadProject();
    } catch (err) {
      setMemberError(err.response?.data?.error || 'Failed to add member');
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    await api.put(`/projects/${id}/tasks/${taskId}`, { status });
    loadTasks();
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!project) return <div>Project not found</div>;

  const grouped = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => nav('/projects')}>
          ← Projects
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28 }}>{project.name}</h1>
            {project.description && <p style={{ color: 'var(--text-dim)', marginTop: 4 }}>{project.description}</p>}
            <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              <span>👤 {project.owner_name}</span>
              <span>📋 {tasks.length} tasks</span>
              <span>👥 {project.members?.length || 0} members</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditTask(null); setShowTaskModal(true); }}>
              + Add Task
            </button>
            {isAdmin && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowMemberModal(true)}>
                  + Member
                </button>
                <button className="btn btn-danger btn-sm" onClick={deleteProject}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {['tasks', 'board', 'members'].map(t => (
          <button
            key={t}
            className="btn btn-ghost"
            style={{
              borderRadius: '8px 8px 0 0', textTransform: 'capitalize',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t ? 'var(--accent)' : 'var(--text-dim)'
            }}
            onClick={() => setTab(t)}
          >
            {t === 'tasks' ? '📋 Tasks' : t === 'board' ? '🗂 Board' : '👥 Members'}
          </button>
        ))}
      </div>

      {/* Filters (tasks tab) */}
      {tab === 'tasks' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <select style={{ width: 'auto' }} value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select style={{ width: 'auto' }} value={filter.priority} onChange={e => setFilter({...filter, priority: e.target.value})}>
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
          </select>
          {(filter.status || filter.priority) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilter({ status: '', priority: '' })}>Clear ✕</button>
          )}
        </div>
      )}

      {/* Tasks List */}
      {tab === 'tasks' && (
        tasks.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <h3>No tasks yet</h3>
            <p>Add your first task to get started</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{t.title}</div>
                        {t.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.description.substring(0, 60)}{t.description.length > 60 ? '...' : ''}</div>}
                      </td>
                      <td>
                        <select
                          className="badge"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                          value={t.status}
                          onChange={e => updateTaskStatus(t.id, e.target.value)}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                      </td>
                      <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t.assignee_name || '—'}</td>
                      <td style={{ fontSize: 13, color: t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done' ? 'var(--danger)' : 'var(--text-dim)' }}>
                        {t.due_date ? format(parseISO(t.due_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditTask(t); setShowTaskModal(true); }}>✏️</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => deleteTask(t.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Board View */}
      {tab === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {STATUSES.map(status => (
            <div key={status} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{grouped[status].length}</span>
              </div>
              {grouped[status].map(t => (
                <div
                  key={t.id}
                  style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: 12, marginBottom: 10,
                    cursor: 'pointer', transition: 'border-color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  onClick={() => { setEditTask(t); setShowTaskModal(true); }}
                >
                  <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 6 }}>{t.title}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                    {t.assignee_name && <span className="chip">{t.assignee_name}</span>}
                  </div>
                  {t.due_date && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                      📅 {format(parseISO(t.due_date), 'MMM d')}
                    </div>
                  )}
                </div>
              ))}
              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)' }}
                onClick={() => { setEditTask(null); setShowTaskModal(true); }}
              >
                + Add Task
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Global Role</th><th>Project Role</th>{isAdmin && <th></th>}</tr></thead>
              <tbody>
                {project.members?.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>{m.name}</td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{m.email}</td>
                    <td><span className={`badge badge-${m.global_role}`}>{m.global_role}</span></td>
                    <td><span className={`badge badge-${m.project_role}`}>{m.project_role}</span></td>
                    {isAdmin && (
                      <td>
                        {m.id !== project.owner_id && (
                          <button className="btn btn-danger btn-sm" onClick={() => removeMember(m.id)}>Remove</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={editTask}
          members={project.members || []}
          projectId={id}
          onClose={() => { setShowTaskModal(false); setEditTask(null); }}
          onSave={() => { setShowTaskModal(false); setEditTask(null); loadTasks(); }}
        />
      )}

      {/* Add Member Modal */}
      {showMemberModal && isAdmin && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMemberModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Add Member</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowMemberModal(false)}>✕</button>
            </div>
            {memberError && <div className="alert alert-error">{memberError}</div>}
            {memberSuccess && <div className="alert alert-success">{memberSuccess}</div>}
            <form onSubmit={addMember}>
              <div className="form-group">
                <label>Member Email</label>
                <input type="email" placeholder="member@example.com" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={memberRole} onChange={e => setMemberRole(e.target.value)}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskModal({ task, members, projectId, onClose, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '',
    due_date: task?.due_date ? task.due_date.split('T')[0] : ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = { ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null };
      if (task) {
        await api.put(`/projects/${projectId}/tasks/${task.id}`, payload);
      } else {
        await api.post(`/projects/${projectId}/tasks`, payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Title *</label>
            <input type="text" placeholder="Task title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required autoFocus />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} placeholder="Optional details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Assignee</label>
              <select value={form.assignee_id} onChange={e => setForm({...form, assignee_id: e.target.value})}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '...' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
