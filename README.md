# 🧠 DutySwap
### Health-Aware Task Reallocation System for High-Stress Professional Environments

DutySwap is an **AI-assisted workload management system** that monitors employee stress levels and automatically redistributes tasks to prevent burnout and improve productivity.

The system uses a **rule-based stress scoring model** and a **Greedy Load Balancing algorithm** to intelligently redistribute tasks when employees experience high stress.

---

# 🚀 Features

✔ Employee daily wellness check-in  
✔ Stress level classification system  
✔ Automatic task redistribution (AI)  
✔ Admin dashboard for monitoring team wellness  
✔ Task assignment and management  
✔ Manual task reallocation  
✔ Stress history tracking  
✔ Help request system between employees  
✔ Notification system  
✔ Reallocation activity logs

---

# 🧩 System Architecture

            ┌─────────────────────────┐
            │        Frontend         │
            │  React + TypeScript    │
            │  Vite + Tailwind CSS   │
            └──────────┬─────────────┘
                       │
                       │ REST API
                       ▼
            ┌─────────────────────────┐
            │         Backend         │
            │ Node.js + Express + TS  │
            │ Business Logic & AI     │
            └──────────┬─────────────┘
                       │
                       ▼
            ┌─────────────────────────┐
            │        Database         │
            │ SQLite + Drizzle ORM    │
            └─────────────────────────┘

---

# 🧠 AI / Algorithm Logic

### Stress Calculation

Employees answer **10 wellness questions**

Each question score:


1 → Very Good
2 → Normal
3 → Stressed
4 → Very Stressed


Total Score Range:


10 → Minimum Stress
40 → Maximum Stress


### Stress Classification

| Score Range | Stress Level |
|-------------|-------------|
| 10 – 15 | Low |
| 16 – 25 | Medium |
| 26 – 40 | High |

---

# ⚙️ Task Reallocation Algorithm

DutySwap uses a **Greedy Load Balancing Algorithm**.

### Steps

1️⃣ Detect employee with **High Stress**

2️⃣ Fetch employee's **pending tasks**

3️⃣ Find employees with **lowest stress levels**

4️⃣ Sort candidates by:


lowest stress
lowest task count


5️⃣ Reassign tasks automatically

---

# 📂 Project Structure


DutySwap
│
├── client/ # React Frontend
│ └── src/
│ ├── pages
│ ├── components
│ └── App.tsx
│
├── server/ # Backend
│ ├── index.ts
│ ├── routes.ts
│ ├── storage.ts
│ └── db.ts
│
├── shared/
│ └── schema.ts # Database schema
│
├── drizzle/ # ORM migration files
│
├── package.json
├── sqlite.db
└── README.md


---

# 🖥️ Running the Project (From Scratch)

Running the Project on Another System

Follow the steps below to run this project from scratch.

Step 1 – Install Required Software

Install the following tools.

Node.js (Version 18 or later)

Download from:
https://nodejs.org

Verify installation:

node -v
npm -v

Install Git if not installed.

Download from:
https://git-scm.com

Verify installation:

git --version

Step 2 – Clone the Repository

Open terminal or command prompt.

Run:

git clone https://github.com/mohankumar-2107/dutyswap.git

Move into the project folder:

cd dutyswap

Step 3 – Install Project Dependencies

Run the following command:

npm install

This will install all required libraries such as React, Express, TypeScript, Tailwind, Drizzle ORM and other dependencies.

Step 4 – Setup the Database

The project uses SQLite.

If the database file does not exist, it will automatically be created when the server starts.

If you want to reset the database, delete the file:

sqlite.db

Then restart the server.

Step 5 – Start the Development Server

Run:

npm run dev

This will start both the backend server and the frontend application.

Expected output:

Server running at http://localhost:3000

Step 6 – Open the Application

Open your browser and go to:

http://localhost:3000

Default Login Credentials

Admin Login

Username: admin
Password: admin123

Employee Login

Employees log in using their Employee ID.

Example seeded employees:

Alice Johnson
Bob Smith
Charlie Brown

How the System Works

Employees complete the daily wellness check-in questionnaire.

The system calculates the stress score.

If stress is classified as high, the AI engine activates.

The algorithm redistributes tasks among employees with lower stress levels.

The admin dashboard updates in real time to show stress distribution and reallocation logs.

Future Improvements

Possible enhancements include:


Machine learning based stress prediction
Stress trend analysis over time
Email or Slack notifications
Team stress heatmaps
Advanced task prioritization models
Predictive workload balancing

-GB
