"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";

interface AnalyticsData {
  totalFocusMinutes: number;
  totalFocusHours: number;
  sessionsCount: number;
  tasksCompleted: number;
  tasksByStatus: { status: string; _count: number }[];
  peakHour: { hour: number; label: string; minutes: number } | null;
  weeklyData: { date: string; day: string; minutes: number; hours: number }[];
  peakHours: { hour: number; label: string; minutes: number }[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-lg text-xs"
        style={{ background: "rgba(9,9,15,0.95)", border: "1px solid rgba(110,231,247,0.2)", fontFamily: "JetBrains Mono, monospace", color: "#6ee7f7" }}>
        <div>{label}</div>
        <div className="font-bold">{payload[0].value}h</div>
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetch(`/api/analytics?date=${date}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm opacity-30" style={{ fontFamily: "JetBrains Mono, monospace" }}>Loading analytics...</div>
      </div>
    );
  }

  if (!data) return null;

  const peakHoursFiltered = data.peakHours.filter((h) => h.hour >= 6 && h.hour <= 23);
  const maxPeakMinutes = Math.max(...peakHoursFiltered.map((h) => h.minutes), 1);

  const taskTotal = data.tasksByStatus.reduce((acc, s) => acc + s._count, 0);

  return (
    <div className="h-full p-6 overflow-auto animate-slide-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif", color: "#6ee7f7" }}>
          Daily Analytics
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(226,232,240,0.4)", fontFamily: "JetBrains Mono, monospace" }}>
          {new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Focus Today"
          value={`${data.totalFocusHours}h`}
          sub={`${data.totalFocusMinutes} minutes`}
          color="#6ee7f7"
          icon="🎯"
        />
        <StatCard
          label="Sessions"
          value={String(data.sessionsCount)}
          sub="pomodoro completed"
          color="#a78bfa"
          icon="⏱"
        />
        <StatCard
          label="Tasks Done"
          value={String(data.tasksCompleted)}
          sub="completed today"
          color="#4ade80"
          icon="✅"
        />
        <StatCard
          label="Peak Time"
          value={data.peakHour ? `${String(data.peakHour.hour).padStart(2, "0")}:00` : "—"}
          sub={data.peakHour ? `${data.peakHour.minutes}m focused` : "no data yet"}
          color="#fb923c"
          icon="🔥"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Weekly Focus Chart */}
        <div className="card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "#6ee7f7", fontFamily: "Syne, sans-serif" }}>
            Weekly Focus Hours
          </h3>
          {data.weeklyData.every((d) => d.hours === 0) ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs opacity-30" style={{ fontFamily: "JetBrains Mono, monospace" }}>ยังไม่มีข้อมูล</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data.weeklyData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6ee7f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6ee7f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: "rgba(226,232,240,0.4)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(226,232,240,0.3)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="hours" stroke="#6ee7f7" strokeWidth={2} fill="url(#focusGradient)" dot={{ fill: "#6ee7f7", strokeWidth: 0, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Task Status Chart */}
        <div className="card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "#6ee7f7", fontFamily: "Syne, sans-serif" }}>
            Task Overview
          </h3>
          {taskTotal === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs opacity-30" style={{ fontFamily: "JetBrains Mono, monospace" }}>ยังไม่มี Task</p>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {[
                { status: "todo", label: "To Do", color: "#6ee7f7" },
                { status: "inprogress", label: "In Progress", color: "#fb923c" },
                { status: "done", label: "Done", color: "#4ade80" },
              ].map((s) => {
                const count = data.tasksByStatus.find((t) => t.status === s.status)?._count || 0;
                const pct = taskTotal > 0 ? (count / taskTotal) * 100 : 0;
                return (
                  <div key={s.status}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        <span style={{ color: "rgba(226,232,240,0.6)" }}>{s.label}</span>
                      </div>
                      <span style={{ color: s.color, fontFamily: "JetBrains Mono, monospace" }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: s.color, boxShadow: `0 0 6px ${s.color}60` }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="text-xs opacity-40" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  Total: {taskTotal} tasks
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Peak Hours Heatmap */}
      <div className="card rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "#6ee7f7", fontFamily: "Syne, sans-serif" }}>
          Peak Productivity Hours (Today)
        </h3>
        {peakHoursFiltered.every((h) => h.minutes === 0) ? (
          <div className="h-24 flex items-center justify-center">
            <p className="text-xs opacity-30" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              เริ่ม Pomodoro เพื่อดูข้อมูล Peak Hours
            </p>
          </div>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {peakHoursFiltered.map((h) => {
              const heightPct = maxPeakMinutes > 0 ? (h.minutes / maxPeakMinutes) * 100 : 0;
              const isPeak = h.minutes === maxPeakMinutes && maxPeakMinutes > 0;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full flex items-end" style={{ height: "80px" }}>
                    <div className="absolute bottom-0 w-full rounded-sm transition-all duration-500"
                      style={{
                        height: `${Math.max(heightPct, h.minutes > 0 ? 8 : 2)}%`,
                        background: isPeak
                          ? "linear-gradient(180deg, #fb923c, #6ee7f7)"
                          : h.minutes > 0 ? "#6ee7f7" : "rgba(255,255,255,0.06)",
                        boxShadow: isPeak ? "0 0 12px rgba(251,146,60,0.5)" : h.minutes > 0 ? "0 0 6px rgba(110,231,247,0.3)" : "none",
                        opacity: h.minutes > 0 ? 0.85 : 1,
                      }} />
                  </div>
                  <span className="text-xs opacity-30 group-hover:opacity-70 transition-opacity"
                    style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem" }}>
                    {String(h.hour).padStart(2, "0")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {data.peakHour && (
          <div className="mt-3 px-3 py-2 rounded-lg text-xs"
            style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)", color: "#fb923c", fontFamily: "JetBrains Mono, monospace" }}>
            🔥 Peak: {data.peakHour.label} · {data.peakHour.minutes} minutes focused
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub: string; color: string; icon: string;
}) {
  return (
    <div className="card rounded-xl p-4 transition-all"
      style={{ borderColor: `${color}20` }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <div className="w-1.5 h-1.5 rounded-full mt-1"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      <div className="text-2xl font-bold mb-0.5"
        style={{ fontFamily: "JetBrains Mono, monospace", color }}>
        {value}
      </div>
      <div className="text-xs opacity-40">{label}</div>
      <div className="text-xs mt-0.5" style={{ color: `${color}80`, fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem" }}>
        {sub}
      </div>
    </div>
  );
}
