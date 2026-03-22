"use client";
import { useState, useEffect } from "react";
import { format, subDays, eachDayOfInterval, startOfWeek, getDay } from "date-fns";
import { th } from "date-fns/locale";

interface HabitCompletion {
  id: string;
  habitId: string;
  date: string;
}

interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  completions: HabitCompletion[];
}

const ICON_OPTIONS = ["💧", "📚", "🏃", "🧘", "💊", "✍️", "🎯", "🌿", "😴", "🍎"];
const COLOR_OPTIONS = ["#6ee7f7", "#a78bfa", "#4ade80", "#fb923c", "#f87171", "#facc15", "#f472b6"];

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "⭐", color: "#6ee7f7" });
  const [today] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => { fetchHabits(); }, []);

  async function fetchHabits() {
    try {
      const res = await fetch("/api/habits");
      const data = await res.json();
      setHabits(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function createHabit() {
    if (!form.name.trim()) return;
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const habit = await res.json();
    setHabits((prev) => [...prev, habit]);
    setForm({ name: "", icon: "⭐", color: "#6ee7f7" });
    setShowForm(false);
  }

  async function toggleHabit(habitId: string, date: string) {
    await fetch("/api/habits/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId, date }),
    });
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const exists = h.completions.some((c) => c.date === date);
        return {
          ...h,
          completions: exists
            ? h.completions.filter((c) => c.date !== date)
            : [...h.completions, { id: "temp", habitId, date }],
        };
      })
    );
  }

  async function deleteHabit(id: string) {
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  function isCompleted(habit: Habit, date: string) {
    return habit.completions.some((c) => c.date === date);
  }

  // Generate last 91 days (13 weeks) for heatmap
  function getHeatmapDays() {
    const end = new Date();
    const start = subDays(end, 90);
    return eachDayOfInterval({ start, end });
  }

  const heatmapDays = getHeatmapDays();

  // Get last 7 days for the daily check-in row
  const last7Days = Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), 6 - i), "yyyy-MM-dd")
  );

  const weekLabels = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

  // Overall stats
  const todayCompletions = habits.filter((h) => isCompleted(h, today)).length;
  const todayRate = habits.length > 0 ? Math.round((todayCompletions / habits.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col p-6 animate-slide-in overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif", color: "#6ee7f7" }}>
            Habit Tracker
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(226,232,240,0.4)", fontFamily: "JetBrains Mono, monospace" }}>
            วันนี้ทำแล้ว {todayCompletions}/{habits.length} นิสัย · {todayRate}%
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(110,231,247,0.15), rgba(167,139,250,0.15))",
            border: "1px solid rgba(110,231,247,0.3)",
            color: "#6ee7f7",
          }}>
          <span>+</span> นิสัยใหม่
        </button>
      </div>

      {/* Today's progress bar */}
      <div className="card rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: "rgba(226,232,240,0.5)", fontFamily: "JetBrains Mono, monospace" }}>
            Today's Progress
          </span>
          <span className="text-xs font-bold" style={{ color: "#4ade80", fontFamily: "JetBrains Mono, monospace" }}>
            {todayRate}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${todayRate}%`,
              background: "linear-gradient(90deg, #6ee7f7, #4ade80)",
              boxShadow: "0 0 8px rgba(74,222,128,0.4)",
            }} />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm opacity-30" style={{ fontFamily: "JetBrains Mono, monospace" }}>Loading...</div>
        </div>
      ) : habits.length === 0 ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div className="text-4xl opacity-20">🎯</div>
          <p className="text-sm opacity-30" style={{ fontFamily: "JetBrains Mono, monospace" }}>ยังไม่มีนิสัย กด "+ นิสัยใหม่" เพื่อเริ่ม</p>
        </div>
      ) : (
        <div className="space-y-4">
          {habits.map((habit) => {
            const streak = calcStreak(habit);
            const completionRate = Math.round(
              (habit.completions.length / Math.min(90, Math.max(1, getDaysSinceCreated(habit)))) * 100
            );

            return (
              <div key={habit.id} className="card rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: `${habit.color}15`, border: `1px solid ${habit.color}30` }}>
                      {habit.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{habit.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: habit.color, fontFamily: "JetBrains Mono, monospace" }}>
                          🔥 {streak} day streak
                        </span>
                        <span className="text-xs opacity-30">·</span>
                        <span className="text-xs opacity-40" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                          {completionRate}% rate
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Today button */}
                    <button onClick={() => toggleHabit(habit.id, today)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: isCompleted(habit, today) ? `${habit.color}25` : "var(--bg-700)",
                        border: `1px solid ${isCompleted(habit, today) ? `${habit.color}60` : "var(--border-subtle)"}`,
                        color: isCompleted(habit, today) ? habit.color : "rgba(226,232,240,0.4)",
                        boxShadow: isCompleted(habit, today) ? `0 0 12px ${habit.color}30` : "none",
                      }}>
                      {isCompleted(habit, today) ? "✓ Done" : "Mark Done"}
                    </button>
                    <button onClick={() => deleteHabit(habit.id)}
                      className="p-1.5 rounded-lg opacity-30 hover:opacity-70 transition-opacity"
                      style={{ color: "#f87171" }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Last 7 days mini check */}
                <div className="flex gap-1.5 mb-4">
                  {last7Days.map((day) => {
                    const done = isCompleted(habit, day);
                    const dayLabel = weekLabels[new Date(day + "T00:00:00").getDay() === 0 ? 6 : new Date(day + "T00:00:00").getDay() - 1];
                    return (
                      <button key={day} onClick={() => toggleHabit(habit.id, day)}
                        className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all"
                        style={{
                          background: done ? `${habit.color}15` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${done ? `${habit.color}40` : "rgba(255,255,255,0.06)"}`,
                        }}>
                        <span className="text-xs font-mono" style={{ color: done ? habit.color : "rgba(226,232,240,0.25)", fontSize: "0.55rem" }}>
                          {dayLabel}
                        </span>
                        <div className="w-3 h-3 rounded-sm"
                          style={{ background: done ? habit.color : "rgba(255,255,255,0.06)", boxShadow: done ? `0 0 6px ${habit.color}60` : "none" }} />
                      </button>
                    );
                  })}
                </div>

                {/* Heatmap */}
                <div>
                  <div className="text-xs opacity-30 mb-2" style={{ fontFamily: "JetBrains Mono, monospace" }}>90-day view</div>
                  <Heatmap
                    days={heatmapDays}
                    habit={habit}
                    isCompleted={isCompleted}
                    color={habit.color}
                    onHover={setTooltip}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 px-2 py-1 rounded text-xs pointer-events-none"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 30,
            background: "rgba(13,13,24,0.95)",
            border: "1px solid var(--border-default)",
            fontFamily: "JetBrains Mono, monospace",
            color: "#e2e8f0",
          }}>
          {tooltip.text}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-in"
            style={{ background: "var(--bg-700)", border: "1px solid var(--border-default)", boxShadow: "0 0 60px rgba(110,231,247,0.1)" }}>
            <h2 className="text-lg font-bold mb-5" style={{ fontFamily: "Syne, sans-serif", color: "#6ee7f7" }}>
              นิสัยใหม่
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>ชื่อนิสัย</label>
                <input autoFocus value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && createHabit()}
                  placeholder="เช่น ดื่มน้ำ 8 แก้ว..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: "var(--bg-800)", border: "1px solid var(--border-default)", color: "#e2e8f0" }} />
              </div>
              <div>
                <label className="text-xs mb-1.5 block opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>ไอคอน</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button key={icon} onClick={() => setForm((f) => ({ ...f, icon }))}
                      className="w-9 h-9 rounded-lg text-lg transition-all"
                      style={{
                        background: form.icon === icon ? "rgba(110,231,247,0.15)" : "var(--bg-800)",
                        border: `1px solid ${form.icon === icon ? "rgba(110,231,247,0.4)" : "var(--border-subtle)"}`,
                      }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>สี</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button key={color} onClick={() => setForm((f) => ({ ...f, color }))}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{
                        background: color,
                        border: `2px solid ${form.color === color ? "#fff" : "transparent"}`,
                        boxShadow: form.color === color ? `0 0 12px ${color}` : "none",
                      }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--bg-800)", border: "1px solid var(--border-subtle)", color: "rgba(226,232,240,0.5)" }}>
                ยกเลิก
              </button>
              <button onClick={createHabit}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{
                  background: "linear-gradient(135deg, rgba(110,231,247,0.2), rgba(167,139,250,0.2))",
                  border: "1px solid rgba(110,231,247,0.4)", color: "#6ee7f7",
                }}>
                สร้าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Heatmap({ days, habit, isCompleted, color, onHover }: {
  days: Date[];
  habit: Habit;
  isCompleted: (habit: Habit, date: string) => boolean;
  color: string;
  onHover: (t: { text: string; x: number; y: number } | null) => void;
}) {
  // Group into weeks (columns)
  const weeks: Date[][] = [];
  let week: Date[] = [];

  // Pad start
  const firstDay = days[0];
  const startPad = getDay(firstDay) === 0 ? 6 : getDay(firstDay) - 1;
  for (let i = 0; i < startPad; i++) week.push(null as unknown as Date);

  days.forEach((day) => {
    week.push(day);
    if (week.length === 7) { weeks.push(week); week = []; }
  });
  if (week.length > 0) weeks.push(week);

  return (
    <div className="flex gap-0.5 overflow-x-auto pb-1">
      {weeks.map((wk, wi) => (
        <div key={wi} className="flex flex-col gap-0.5">
          {wk.map((day, di) => {
            if (!day) return <div key={di} className="w-3 h-3" />;
            const dateStr = format(day, "yyyy-MM-dd");
            const done = isCompleted(habit, dateStr);
            return (
              <div key={di}
                className="heatmap-cell w-3 h-3 rounded-sm cursor-pointer"
                style={{
                  background: done ? color : "rgba(255,255,255,0.05)",
                  opacity: done ? 0.9 : 1,
                  boxShadow: done ? `0 0 4px ${color}60` : "none",
                }}
                onMouseEnter={(e) => onHover({
                  text: `${format(day, "d MMM")} — ${done ? "✓ Done" : "—"}`,
                  x: e.clientX, y: e.clientY,
                })}
                onMouseLeave={() => onHover(null)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function calcStreak(habit: Habit): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const date = format(subDays(today, i), "yyyy-MM-dd");
    if (habit.completions.some((c) => c.date === date)) {
      streak++;
    } else { break; }
  }
  return streak;
}

function getDaysSinceCreated(habit: Habit): number {
  const created = new Date(habit.completions.length > 0
    ? habit.completions.reduce((min, c) => c.date < min ? c.date : min, habit.completions[0].date)
    : new Date().toISOString().split("T")[0]);
  return Math.ceil((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}
