# ⚡ TaskFlow — Team Task Manager

A full-stack project and task management application with role-based access control.

## 🚀 Live Demo
> Deploy URL goes here after Railway deployment

## 📸 Features

- **Authentication** — JWT-based signup/login with role selection (Admin/Member)
- **Projects** — Create, manage, and delete projects with descriptions
- **Team Management** — Add/remove members to projects with role assignment
- **Task Tracking** — Full CRUD with status (To Do / In Progress / Done), priority (Low/Medium/High), assignee, and due dates
- **Kanban Board** — Visual drag-free board view grouped by status
- **Dashboard** — Personal stats, progress bars, overdue task alerts, recent activity
- **Admin Panel** — Global user management and role promotion (Admin only)
- **RBAC** — Global Admin vs Member roles + per-project Admin vs Member roles

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6 |
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT + bcrypt |
| Validation | express-validator |
| Deployment | Railway |

## 📁 Project Structure

```
taskflow/
├── server/               # Express API
│   ├── routes/
│   │   ├── auth.js       # POST /api/auth/signup, /login, GET /me
│   │   ├── projects.js   # CRUD + member management
│   │   ├── tasks.js      # CRUD with filters
│   │   └── users.js      # Admin user management + dashboard
│   ├── db.js             # SQLite schema + connection
│   ├── middleware.js     # JWT auth + RBAC middleware
│   └── index.js          # Express app entry point
├── client/               # React SPA
│   └── src/
│       ├── pages/        # AuthPage, Dashboard, Projects, ProjectDetail, Users
│       ├── components/   # Layout (Sidebar nav)
│       ├── context/      # AuthContext (JWT state)
│       └── api.js        # Axios instance
├── railway.toml          # Railway deployment config
└── package.json          # Root scripts for build + start
```

## 🔑 API Endpoints

### Auth
- `POST /api/auth/signup` — Register (name, email, password, role)
- `POST /api/auth/login` — Login (email, password) → JWT
- `GET  /api/auth/me` — Get current user

### Projects
- `GET    /api/projects` — List my projects
- `POST   /api/projects` — Create project
- `GET    /api/projects/:id` — Project + members
- `PUT    /api/projects/:id` — Update (project admin)
- `DELETE /api/projects/:id` — Delete (project admin)
- `POST   /api/projects/:id/members` — Add member by email
- `DELETE /api/projects/:id/members/:userId` — Remove member

### Tasks
- `GET    /api/projects/:pid/tasks` — List tasks (filter: status, priority, assignee_id)
- `POST   /api/projects/:pid/tasks` — Create task
- `GET    /api/projects/:pid/tasks/:id` — Task detail
- `PUT    /api/projects/:pid/tasks/:id` — Update task
- `DELETE /api/projects/:pid/tasks/:id` — Delete task

### Users (Admin)
- `GET  /api/users` — All users
- `GET  /api/users/search?email=` — Search user
- `GET  /api/users/dashboard` — Personal dashboard data
- `PUT  /api/users/:id/role` — Change user role

## 🚂 Deploy on Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Add environment variables:
   ```
   NODE_ENV=production
   JWT_SECRET=your-random-secret-here
   PORT=5000
   ```
5. Railway auto-builds and deploys
6. Copy the generated URL as your live app URL

## 💻 Local Development

```bash
# Install all dependencies
cd server && npm install
cd ../client && npm install

# Terminal 1: Start server
cd server && npm run dev

# Terminal 2: Start React
cd client && npm start
```

App runs at `http://localhost:3000`, API at `http://localhost:5000`

## 🔐 Role-Based Access Control

| Action | Global Member | Project Member | Project Admin | Global Admin |
|--------|:---:|:---:|:---:|:---:|
| View own projects | ✅ | ✅ | ✅ | ✅ |
| Create project | ✅ | ✅ | ✅ | ✅ |
| Add members | ❌ | ❌ | ✅ | ✅ |
| Delete project | ❌ | ❌ | ✅ | ✅ |
| Create task | ❌ | ✅ | ✅ | ✅ |
| Update own task | ❌ | ✅ | ✅ | ✅ |
| Delete any task | ❌ | ❌ | ✅ | ✅ |
| View all users | ❌ | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ❌ | ✅ |
