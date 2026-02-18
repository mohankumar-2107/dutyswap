# DUTYSWAP - AI Health-Aware Task Reallocation System

## Overview

DUTYSWAP is a full-stack web application that helps organizations manage employee stress and automatically reassign tasks when stress levels are high. It features an AI-based wellness chat that assesses stress through a 10-question survey, automatic task reallocation from high-stress employees to low-stress ones, and separate Admin and Employee dashboards with data visualization.

The app provides:
- **Employee panel**: Stress self-assessment via AI wellness chat, task management, stress trend visualization
- **Admin panel**: Employee management, task assignment, stress distribution overview, reallocation logs, and aggregate statistics
- **Automatic duty swapping**: When an employee reports high stress, their pending tasks are automatically reassigned to lower-stress colleagues

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React + Vite)
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: `wouter` for client-side routing (lightweight alternative to React Router)
- **State Management**: `@tanstack/react-query` for server state (data fetching, caching, mutations)
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Charts**: `recharts` for stress trend lines, bar charts, and pie charts
- **Animations**: `framer-motion` for page transitions and micro-interactions
- **Styling**: Tailwind CSS with CSS variables for theming; Yellow/Gold primary color with white glassmorphism aesthetic
- **Fonts**: Outfit (sans), Playfair Display (display/serif)
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend (Express + Node.js)
- **Framework**: Express 5 running on Node.js via `tsx`
- **API Design**: REST API under `/api/` prefix, with route definitions shared between client and server via `shared/routes.ts`
- **Validation**: Zod schemas for input validation, with `drizzle-zod` for generating insert schemas from database tables
- **Development**: Vite dev server middleware serves the frontend with HMR; in production, static files are served from `dist/public`
- **Build**: Custom build script using esbuild for server bundling and Vite for client bundling

### Shared Layer (`shared/`)
- **`schema.ts`**: Drizzle ORM table definitions and Zod insert schemas — the single source of truth for data types
- **`routes.ts`**: API route definitions (paths, methods, input/output schemas) shared between frontend hooks and backend handlers

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (connected via `DATABASE_URL` environment variable)
- **Connection**: `pg` Pool via `node-postgres`
- **Schema push**: `drizzle-kit push` for schema migrations (no migration files needed for development)
- **Tables**:
  - `employees` — id, name, role (admin/employee), currentStress, username, password
  - `tasks` — id, title, assignedToId (FK to employees), priority, status, createdAt
  - `stressLogs` — id, employeeId, stressLevel, totalScore, answers (JSONB), loggedAt, date
  - `dutyLogs` — id, taskId, fromEmployeeId, toEmployeeId, reallocationDate, reason
  - `messages` — id, employeeId, content, sentAt

### Authentication
- Simplified/simulated authentication (no session persistence or JWT):
  - **Admin**: hardcoded username `admin` / password `admin123`
  - **Employee**: select from a dropdown of existing employees (demo-style login)
  - Auth state is managed client-side via React Query cache (`/api/auth/me` endpoint)

### Storage Pattern
- `IStorage` interface in `server/storage.ts` defines all data access methods
- `DatabaseStorage` class implements the interface using Drizzle ORM queries
- Exported as a singleton `storage` instance used by route handlers

### Key Data Flow
1. Employee completes 10-question AI wellness chat
2. Answers are scored (1-4 per question, total 10-40) and mapped to stress level (1-5)
3. Stress is logged and employee's `currentStress` is updated
4. If stress is high (≥4), system automatically finds low-stress employees and reassigns pending tasks
5. Reallocation is logged in `dutyLogs` table
6. Admin dashboard shows real-time stats, stress distribution charts, and reallocation history

## External Dependencies

### Database
- **PostgreSQL** — Required, connected via `DATABASE_URL` environment variable. Used with Drizzle ORM and `node-postgres` (`pg` package).

### Key NPM Packages
- **Frontend**: React, Vite, @tanstack/react-query, wouter, recharts, framer-motion, date-fns, shadcn/ui (Radix UI + Tailwind CSS + class-variance-authority)
- **Backend**: Express 5, drizzle-orm, drizzle-zod, pg, zod, nanoid
- **Build tools**: tsx (TypeScript execution), esbuild (server bundling), Vite (client bundling), drizzle-kit (schema management)
- **Replit plugins**: @replit/vite-plugin-runtime-error-modal, @replit/vite-plugin-cartographer, @replit/vite-plugin-dev-banner

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required)
- `NODE_ENV` — Set to `development` for dev mode, `production` for production build

### No External AI Services
- The "AI" wellness assessment is a rule-based scoring system using predefined questions and option weights — no external AI API calls are made.