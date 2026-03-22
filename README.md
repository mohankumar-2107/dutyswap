<div align="center">

# 🧠 DutySwap
### Health-Aware Task Reallocation System

**DutySwap** is an AI-assisted workload management platform that monitors employee stress in real time and automatically redistributes tasks to prevent burnout and boost team productivity.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square&logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![SQLite](https://img.shields.io/badge/SQLite-Drizzle_ORM-003B57?style=flat-square&logo=sqlite)](https://orm.drizzle.team)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📋 **Daily Wellness Check-in** | 10-question stress assessment for every employee |
| 🤖 **AI Task Reallocation** | Greedy algorithm auto-redistributes tasks on high stress |
| 🔄 **Manual Reallocation** | Admin can manually shift tasks between employees |
| 📊 **Admin Dashboard** | Real-time stress charts, team status, and duty logs |
| 🤝 **Peer Assistance** | Employees can request help from low-stress colleagues |
| 💬 **In-App Chat** | Real-time messaging between peers via help requests |
| 🔔 **Notifications** | Instant alerts for requests, acceptances, and updates |
| 📈 **Stress History** | Track each employee's wellness trends over time |
| 👥 **Employee Management** | Add, edit, and remove employees from the system |

---

## 🏗️ System Architecture

```
┌─────────────────────────┐
│        Frontend         │
│   React + TypeScript    │
│   Vite + Tailwind CSS   │
└──────────┬──────────────┘
           │  REST API
           ▼
┌─────────────────────────┐
│         Backend         │
│  Node.js + Express + TS │
│  Business Logic & AI    │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│        Database         │
│  SQLite + Drizzle ORM   │
└─────────────────────────┘
```

---

## 🧠 AI & Algorithm Logic

### Stress Scoring

Employees answer **10 wellness questions**, each scored 1–4:

| Score | Meaning |
|-------|---------|
| 1 | Very Good |
| 2 | Normal |
| 3 | Stressed |
| 4 | Very Stressed |

> Total score range: **10 (min)** → **40 (max)**

### Stress Classification

| Score Range | Stress Level | Action |
|-------------|-------------|--------|
| 10 – 15 | 🟢 Low | No action |
| 16 – 25 | 🟡 Medium | Monitor |
| 26 – 40 | 🔴 High | AI reallocation triggered |

### Greedy Load Balancing Algorithm

```
1. Detect employee with HIGH stress
2. Fetch their pending tasks
3. Find all available low-stress employees
4. Sort candidates by:
   → Lowest stress level first
   → Lowest task count as tiebreaker
5. Redistribute tasks across sorted candidates
6. Log every reallocation to duty logs
```

---

## 📂 Project Structure

```
DutySwap/
│
├── client/                  # React Frontend
│   └── src/
│       ├── pages/           # AdminDashboard, EmployeeDashboard, etc.
│       ├── components/      # StressBadge, Layout, etc.
│       ├── hooks/           # useAuth, useTasks, useStress, etc.
│       └── App.tsx
│
├── server/                  # Express Backend
│   ├── index.ts
│   ├── routes.ts            # All API routes
│   ├── storage.ts           # Database access layer
│   └── db.ts                # Drizzle DB connection
│
├── shared/
│   └── schema.ts            # Database schema & Zod types
│
├── drizzle/                 # ORM migration files
├── sqlite.db                # SQLite database file
├── package.json
└── README.md
```

---

## ⚡ Quick Setup After Pulling

> Already cloned the repo? Just run these 4 commands:

```bash
git pull
npm install
npx drizzle-kit push
npm run dev
```

> **Note:** When `drizzle-kit push` prompts you, select **"+ create column"** for any new columns and press Enter to confirm.

---

## 🖥️ Full Setup From Scratch

### Step 1 — Install Required Software

**Node.js v18+**
```bash
# Download from https://nodejs.org
node -v
npm -v
```

**Git**
```bash
# Download from https://git-scm.com
git --version
```

---

### Step 2 — Clone the Repository

```bash
git clone https://github.com/mohankumar-2107/dutyswap.git
cd dutyswap
```

---

### Step 3 — Install Dependencies

```bash
npm install
```

Installs React, Express, TypeScript, Tailwind CSS, Drizzle ORM, and all other dependencies.

---

### Step 4 — Setup the Database

```bash
npx drizzle-kit push
```

- SQLite database (`sqlite.db`) is created automatically on first run
- Run the above command to sync the latest schema

**To reset the database:**
```bash
# Windows
del sqlite.db

# Mac / Linux
rm sqlite.db
```
Then restart the server — it will re-seed with default data automatically.

---

### Step 5 — Start the Development Server

```bash
npm run dev
```

Starts both the backend (Express) and frontend (React + Vite) together.

```
✓ Server running at http://localhost:3000
```

---

### Step 6 — Open the Application

```
http://localhost:3000
```

---

## 🔐 Login Credentials

### Admin
| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

### Employee
Employees log in using their **Employee ID**.

| Name | Employee ID |
|------|-------------|
| Alice Johnson | `2` |
| Bob Smith | `3` |
| Charlie Brown | `4` |

---

## 🔮 Future Improvements

- [ ] Machine learning based stress prediction
- [ ] Stress trend analysis and forecasting
- [ ] Email / Slack notification integration
- [ ] Team stress heatmap visualization
- [ ] Advanced task prioritization models
- [ ] Predictive workload balancing
- [ ] Mobile app support

---

<div align="center">

Made with ❤️ by **GB**

</div>
