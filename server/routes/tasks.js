const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, requireProjectAccess } = require('../middleware');

const router = express.Router({ mergeParams: true });

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectAccess, (req, res) => {
  const { status, priority, assignee_id } = req.query;
  let query = `
    SELECT t.*, 
      u1.name as assignee_name, u1.email as assignee_email,
      u2.name as creator_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assignee_id
    LEFT JOIN users u2 ON u2.id = t.creator_id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];
  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (assignee_id) { query += ' AND t.assignee_id = ?'; params.push(assignee_id); }
  query += ' ORDER BY t.created_at DESC';

  res.json(db.prepare(query).all(...params));
});

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, requireProjectAccess, [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('assignee_id').optional().isInt(),
  body('due_date').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, status = 'todo', priority = 'medium', assignee_id, due_date } = req.body;

  // Validate assignee is project member if provided
  if (assignee_id) {
    const member = db.prepare(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.projectId, assignee_id);
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.params.projectId);
    if (!member && project.owner_id != assignee_id) {
      return res.status(400).json({ error: 'Assignee must be a project member' });
    }
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, creator_id, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, status, priority, req.params.projectId, assignee_id || null, req.user.id, due_date || null);

  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u2.name as creator_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assignee_id
    LEFT JOIN users u2 ON u2.id = t.creator_id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(task);
});

// GET /api/projects/:projectId/tasks/:id
router.get('/:id', authenticate, requireProjectAccess, (req, res) => {
  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u1.email as assignee_email, u2.name as creator_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assignee_id
    LEFT JOIN users u2 ON u2.id = t.creator_id
    WHERE t.id = ? AND t.project_id = ?
  `).get(req.params.id, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// PUT /api/projects/:projectId/tasks/:id
router.put('/:id', authenticate, requireProjectAccess, [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('assignee_id').optional({ nullable: true }).isInt(),
  body('due_date').optional({ nullable: true }).isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.id, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Only creator, project admin, or global admin can update
  const isProjectAdmin = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(req.params.projectId, req.user.id);
  
  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.params.projectId);
  const canEdit = req.user.role === 'admin' || 
    task.creator_id === req.user.id || 
    task.assignee_id === req.user.id ||
    project.owner_id === req.user.id ||
    (isProjectAdmin && isProjectAdmin.role === 'admin');
  
  if (!canEdit) return res.status(403).json({ error: 'Cannot edit this task' });

  const fields = ['title', 'description', 'status', 'priority', 'assignee_id', 'due_date'];
  const updates = [];
  const values = [];
  
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id, req.params.projectId);

  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND project_id = ?`).run(...values);
  
  const updated = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u2.name as creator_name
    FROM tasks t LEFT JOIN users u1 ON u1.id = t.assignee_id LEFT JOIN users u2 ON u2.id = t.creator_id
    WHERE t.id = ?
  `).get(req.params.id);
  res.json(updated);
});

// DELETE /api/projects/:projectId/tasks/:id
router.delete('/:id', authenticate, requireProjectAccess, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.id, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.params.projectId);
  const isProjectAdmin = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(req.params.projectId, req.user.id);

  const canDelete = req.user.role === 'admin' || 
    task.creator_id === req.user.id ||
    project.owner_id === req.user.id ||
    (isProjectAdmin && isProjectAdmin.role === 'admin');

  if (!canDelete) return res.status(403).json({ error: 'Cannot delete this task' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
