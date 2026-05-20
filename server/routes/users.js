const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware');

const router = express.Router();

// GET /api/users - admin only
router.get('/', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// GET /api/users/search?email=
router.get('/search', authenticate, (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email query required' });
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE email LIKE ?').get(`%${email}%`);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// GET /api/users/dashboard
router.get('/dashboard', authenticate, (req, res) => {
  const userId = req.user.id;

  // Tasks assigned to me
  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.assignee_id = ?
    ORDER BY t.due_date ASC, t.created_at DESC
    LIMIT 20
  `).all(userId);

  // Overdue tasks
  const overdueTasks = db.prepare(`
    SELECT t.*, p.name as project_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.assignee_id = ? AND t.status != 'done' AND t.due_date < date('now')
    ORDER BY t.due_date ASC
  `).all(userId);

  // Task stats
  const taskStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN status != 'done' AND due_date < date('now') THEN 1 ELSE 0 END) as overdue
    FROM tasks WHERE assignee_id = ?
  `).get(userId);

  // My projects
  let myProjects;
  if (req.user.role === 'admin') {
    myProjects = db.prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count
      FROM projects p ORDER BY p.created_at DESC LIMIT 5
    `).all();
  } else {
    myProjects = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      WHERE p.owner_id = ? OR pm.user_id = ?
      ORDER BY p.created_at DESC LIMIT 5
    `).all(userId, userId, userId);
  }

  res.json({ myTasks, overdueTasks, taskStats, myProjects });
});

// PUT /api/users/:id/role - admin only
router.put('/:id/role', authenticate, requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'Role updated' });
});

module.exports = router;
