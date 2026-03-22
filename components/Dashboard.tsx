"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import KanbanBoard from "./KanbanBoard";
import PomodoroTimer from "./PomodoroTimer";
import HabitTracker from "./HabitTracker";
import Analytics from "./Analytics";

type View = "kanban" | "pomodoro" | "habits" | "analytics";

const NAV = [
  { id: "kanban", label: "Kanban", icon: "⬛", sub: "Task Board" },
  { id: "pomodoro", label: "Pomodoro", icon: "⏱", sub: "Focus Timer" },
  { id: "habits", label: "Habits", icon: "🔥", sub: "Daily Tracker" },
  { id: "analytics", label: "Analytics", icon: "📊", sub: "Insights" },
] as const;

export default function Dashboard() {
  const [view, setView] = useState<View>("kanban");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email ?? "");
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const today = new Date().toLocaleDateString("th-TH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const avatarLetter = userEmail ? userEmail[0].toUpperCase() : "?";

  return (
    <div className="flex h-screen w-full overflow-hidden grid-bg" style={{ background: "var(--bg-900)" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #6ee7f7, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 flex flex-col border-r transition-all duration-300 shrink-0"
        style={{ width: sidebarOpen ? "220px" : "64px", background: "rgba(9,9,15,0.95)", borderColor: "var(--border-subtle)" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #6ee7f7, #a78bfa)", boxShadow: "0 0 16px rgba(110,231,247,0.3)" }}>
            <span className="text-black font-bold text-sm" style={{ fontFamily: "Syne, sans-serif" }}>F</span>
          </div>
          {sidebarOpen && (
            <div>
              <div className="font-bold text-sm tracking-widest" style={{ fontFamily: "Syne, sans-serif", color: "#6ee7f7" }}>FlowOS</div>
              <div className="text-xs opacity-40" style={{ fontFamily: "JetBrains Mono, monospace" }}>v1.0</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV.map((item) => {
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => setView(item.id as View)}
                className={`nav-item relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${active ? "active" : ""}`}
                style={{
                  background: active ? "rgba(110,231,247,0.08)" : "transparent",
                  color: active ? "#6ee7f7" : "rgba(226,232,240,0.5)",
                  border: active ? "1px solid rgba(110,231,247,0.15)" : "1px solid transparent",
                }}>
                <span className="text-lg shrink-0">{item.icon}</span>
                {sidebarOpen && (
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>{item.sub}</div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t p-3 space-y-2" style={{ borderColor: "var(--border-subtle)" }}>
          {sidebarOpen && userEmail && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, #6ee7f7, #a78bfa)", color: "#000" }}>
                {avatarLetter}
              </div>
              <span className="text-xs truncate opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                {userEmail}
              </span>
            </div>
          )}

          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
            style={{ color: "rgba(248,113,113,0.6)", border: "1px solid transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            title="ออกจากระบบ">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {sidebarOpen && <span className="text-xs">ออกจากระบบ</span>}
          </button>

          {sidebarOpen && (
            <div className="text-xs opacity-20 px-1 leading-relaxed" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {today}
            </div>
          )}

          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg transition-colors"
            style={{ color: "rgba(110,231,247,0.4)" }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {sidebarOpen ? <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" /> : <path d="M13 5l7 7-7 7M6 5l7 7-7 7" />}
            </svg>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden relative z-10">
        <div className="h-full overflow-auto">
          {view === "kanban" && <KanbanBoard />}
          {view === "pomodoro" && <PomodoroTimer />}
          {view === "habits" && <HabitTracker />}
          {view === "analytics" && <Analytics />}
        </div>
      </main>
    </div>
  );
}
