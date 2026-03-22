# 🚀 FlowOS — Personal Productivity Dashboard

เว็บแอพ Productivity ครบจบในหน้าเดียว สร้างด้วย **Next.js 14 + PostgreSQL (Supabase) + Prisma**

## ✨ Features

- **Smart Kanban Board** — Drag & Drop, Tags, Priority, Time Tracking
- **Pomodoro Timer** — เชื่อมกับ Task, Web Audio notification, Session Log
- **Habit Tracker** — Heatmap 90 วัน, Streak counter, Daily check-in
- **Daily Analytics** — Weekly chart, Peak hours, Task overview

---

## 🛠️ Setup (5 นาที)

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. สร้าง Database บน Supabase

1. ไปที่ [supabase.com](https://supabase.com) → สร้าง project ใหม่
2. ไปที่ **Settings → Database → Connection string → URI**
3. Copy connection string

### 3. ตั้งค่า Environment Variables

```bash
cp .env.example .env.local
```

แก้ไข `.env.local`:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

### 4. Migrate Database

```bash
npx prisma generate
npx prisma db push
```

### 5. รัน Development Server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) 🎉

---

## 📁 Project Structure

```
productivity-dashboard/
├── app/
│   ├── api/
│   │   ├── tasks/          # CRUD Tasks
│   │   ├── pomodoro/       # Session tracking
│   │   ├── habits/         # Habit management
│   │   └── analytics/      # Dashboard data
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Dashboard.tsx       # Main shell + navigation
│   ├── KanbanBoard.tsx     # Drag & drop board
│   ├── PomodoroTimer.tsx   # Focus timer
│   ├── HabitTracker.tsx    # Habit heatmap
│   └── Analytics.tsx       # Charts & insights
├── lib/
│   └── prisma.ts           # Database client
├── prisma/
│   └── schema.prisma       # Database schema
└── .env.example
```

---

## 🌐 Deploy บน Vercel

```bash
npm install -g vercel
vercel
```

เพิ่ม `DATABASE_URL` ใน Vercel Environment Variables

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Font | JetBrains Mono + Syne + DM Sans |

---

## 💡 Tips

- **Pomodoro** กด Start แล้วเลือก Task เพื่อ track เวลาอัตโนมัติ
- **Kanban** ลาก Card ข้าม Column ได้เลย
- **Habits** คลิก Square ในแถว 7 วันเพื่อ toggle ย้อนหลังได้
- **Analytics** จะแสดงข้อมูลหลังจาก session แรก
