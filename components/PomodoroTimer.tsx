"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Task {
  id: string;
  title: string;
  status: string;
  totalTime: number;
}

type SessionType = "work" | "break" | "longbreak";

const SESSION_CONFIG: Record<SessionType, { duration: number; label: string; color: string; glow: string }> = {
  work: { duration: 25, label: "Focus", color: "#6ee7f7", glow: "rgba(110,231,247,0.3)" },
  break: { duration: 5, label: "Short Break", color: "#4ade80", glow: "rgba(74,222,128,0.3)" },
  longbreak: { duration: 15, label: "Long Break", color: "#a78bfa", glow: "rgba(167,139,250,0.3)" },
};

export default function PomodoroTimer() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>("work");
  const [customMinutes, setCustomMinutes] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [todaySessions, setTodaySessions] = useState<{ duration: number; type: string; completed: boolean; task?: { title: string } }[]>([]);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);   // wall-clock end timestamp (ms)
  const completedRef = useRef(false);               // prevent double-firing

  const totalDuration = (customMinutes ?? SESSION_CONFIG[sessionType].duration) * 60;
  const config = SESSION_CONFIG[sessionType];
  const progress = (timeLeft / totalDuration) * 100;

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    fetch("/api/tasks").then((r) => r.json()).then((data) => {
      const arr = Array.isArray(data) ? data : [];
      setTasks(arr.filter((t: Task) => t.status !== "done"));
    }).catch(console.error);
    fetchTodaySessions();

    // Check existing notification permission
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  async function fetchTodaySessions() {
    // ใช้ timezone ท้องถิ่นแทน UTC เพื่อให้วันที่ถูกต้อง
    const today = new Date().toLocaleDateString("en-CA"); // format: YYYY-MM-DD
    const res = await fetch(`/api/pomodoro?date=${today}`);
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    setTodaySessions(arr);
    const count = arr.filter((s: { type: string; completed: boolean }) => s.type === "work" && s.completed).length;
    setPomodoroCount(count);
    return count;
  }

  // Wall-clock tick: reads real Date.now() so it's accurate even when tab is throttled
  const tick = useCallback(() => {
    if (!endTimeRef.current) return;
    const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
    if (remaining <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        setTimeLeft(0);
        handleComplete();
      }
    } else {
      setTimeLeft(remaining);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isRunning) {
      // Poll every 500ms — fast enough to catch exact end even under throttle
      intervalRef.current = setInterval(tick, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, tick]);

  async function handleStart() {
    const startTime = new Date();
    const durationSec = (customMinutes ?? SESSION_CONFIG[sessionType].duration) * 60;
    // Set wall-clock end time BEFORE starting interval
    endTimeRef.current = Date.now() + durationSec * 1000;
    completedRef.current = false;
    setSessionStartTime(startTime);
    setIsRunning(true);

    try {
      const res = await fetch("/api/pomodoro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTaskId,
          duration: customMinutes ?? SESSION_CONFIG[sessionType].duration,
          type: sessionType === "work" ? "work" : "break",
          startedAt: startTime.toISOString(),
          completed: false,
        }),
      });
      const session = await res.json();
      setSessionId(session.id);
    } catch (e) { console.error(e); }
  }

  async function handleComplete() {
    setIsRunning(false);
    if (sessionId) {
      await fetch("/api/pomodoro", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId,
          endedAt: new Date().toISOString(),
          completed: true,
        }),
      });
    }

    const selectedTask = tasks.find((t) => t.id === selectedTaskId);

    if (sessionType === "work") {
      playBeep("work");
      sendNotification(
        "🍅 Focus Session จบแล้ว!",
        selectedTask
          ? `"${selectedTask.title}" — เวลาพักผ่อนแล้ว 🌿`
          : "ทำได้ดีมาก! เวลาพักผ่อนแล้ว 🌿"
      );
    } else {
      playBeep("break");
      sendNotification(
        "⚡ พักเสร็จแล้ว!",
        "พร้อมกลับมา Focus อีกรอบหรือยัง? 🎯"
      );
    }

    // รอ fetch จาก DB จริงๆ แล้วค่อย update state
    const newCount = await fetchTodaySessions();
    if (sessionType === "work" && newCount !== undefined) {
      setPomodoroCount(newCount);
    }
    setSessionId(null);
    setSessionStartTime(null);
    resetTimer();
  }

  function handlePause() {
    setIsRunning(false);
  }

  function handleStop() {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    endTimeRef.current = null;
    completedRef.current = false;
    resetTimer();
    setSessionId(null);
    setSessionStartTime(null);
  }

  function resetTimer() {
    setTimeLeft((customMinutes ?? SESSION_CONFIG[sessionType].duration) * 60);
  }

  function switchSession(type: SessionType) {
    handleStop();
    setSessionType(type);
    setCustomMinutes(null);
    setTimeLeft(SESSION_CONFIG[type].duration * 60);
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
  }

  function sendNotification(title: string, body: string, icon = "🍅") {
    if (notifPermission !== "granted") return;
    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "pomodoro",
        requireInteraction: false,
      });
    } catch { /* ignore */ }
  }

  function playBeep(type: "work" | "break" = "work") {
    try {
      const ctx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      if (type === "work") {
        // 3 ascending beeps — "session done!"
        [0, 0.25, 0.5].forEach((delay, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(660 + i * 110, ctx.currentTime + delay);
          osc.type = "sine";
          gain.gain.setValueAtTime(0, ctx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.4);
        });
      } else {
        // 1 soft low beep — "break over"
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.type = "sine";
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);
      }
    } catch { /* ignore */ }
  }

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  const todayFocusMin = todaySessions
    .filter((s) => s.type === "work" && s.completed)
    .reduce((acc, s) => acc + s.duration, 0);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 p-6 animate-slide-in overflow-auto">
      {/* Timer Panel */}
      <div className="flex flex-col items-center flex-1">
        <div className="mb-6 w-full">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif", color: "#6ee7f7" }}>
                Pomodoro Timer
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "rgba(226,232,240,0.4)", fontFamily: "JetBrains Mono, monospace" }}>
                {pomodoroCount} sessions · {Math.floor(todayFocusMin / 60)}h {todayFocusMin % 60}m focus today
              </p>
            </div>

            {/* Notification permission button */}
            {"Notification" in (typeof window !== "undefined" ? window : {}) && (
              <button
                onClick={notifPermission === "granted" ? undefined : requestNotificationPermission}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: notifPermission === "granted"
                    ? "rgba(74,222,128,0.1)"
                    : notifPermission === "denied"
                    ? "rgba(248,113,113,0.1)"
                    : "rgba(110,231,247,0.08)",
                  border: `1px solid ${notifPermission === "granted" ? "rgba(74,222,128,0.3)" : notifPermission === "denied" ? "rgba(248,113,113,0.3)" : "rgba(110,231,247,0.2)"}`,
                  color: notifPermission === "granted" ? "#4ade80" : notifPermission === "denied" ? "#f87171" : "#6ee7f7",
                  cursor: notifPermission === "granted" ? "default" : "pointer",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {notifPermission === "granted" ? "🔔 เปิดแจ้งเตือนแล้ว" : notifPermission === "denied" ? "🔕 ถูกบล็อก" : "🔔 เปิดแจ้งเตือน"}
              </button>
            )}
          </div>
        </div>

        {/* Session type switcher */}
        <div className="flex gap-1.5 mb-8 p-1 rounded-xl" style={{ background: "rgba(13,13,24,0.8)", border: "1px solid var(--border-subtle)" }}>
          {(Object.entries(SESSION_CONFIG) as [SessionType, typeof SESSION_CONFIG[SessionType]][]).map(([type, cfg]) => (
            <button key={type} onClick={() => switchSession(type)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: sessionType === type ? `${cfg.color}15` : "transparent",
                border: sessionType === type ? `1px solid ${cfg.color}40` : "1px solid transparent",
                color: sessionType === type ? cfg.color : "rgba(226,232,240,0.4)",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "0.75rem",
              }}>
              {cfg.label}
            </button>
          ))}
        </div>

        {/* SVG Ring Timer */}
        <div className="relative mb-8" style={{ filter: `drop-shadow(0 0 30px ${config.glow})` }}>
          <svg width="280" height="280" viewBox="0 0 280 280">
            {/* Background ring */}
            <circle cx="140" cy="140" r="120"
              fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
            {/* Progress ring */}
            <circle cx="140" cy="140" r="120"
              fill="none"
              stroke={config.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 140 140)"
              style={{ transition: "stroke-dashoffset 1s linear", opacity: isRunning ? 1 : 0.6 }}
            />
            {/* Tick marks */}
            {Array.from({ length: 60 }, (_, i) => {
              const angle = (i / 60) * 360 - 90;
              const rad = (angle * Math.PI) / 180;
              const len = i % 5 === 0 ? 10 : 5;
              const r1 = 132;
              const r2 = r1 - len;
              return (
                <line key={i}
                  x1={140 + r1 * Math.cos(rad)} y1={140 + r1 * Math.sin(rad)}
                  x2={140 + r2 * Math.cos(rad)} y2={140 + r2 * Math.sin(rad)}
                  stroke={config.color} strokeWidth={i % 5 === 0 ? 2 : 1}
                  opacity={i % 5 === 0 ? 0.4 : 0.15}
                />
              );
            })}
            {/* Time display */}
            <text x="140" y="128" textAnchor="middle" dominantBaseline="middle"
              fill={config.color} fontSize="52" fontWeight="700"
              style={{ fontFamily: "JetBrains Mono, monospace", letterSpacing: "-2px" }}>
              {mm}:{ss}
            </text>
            <text x="140" y="170" textAnchor="middle" fill={config.color}
              fontSize="13" opacity="0.6" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {config.label}
            </text>
            {isRunning && (
              <circle cx="140" cy="140" r="115" fill="none"
                stroke={config.color} strokeWidth="1" opacity="0.1"
                style={{ animation: "pulse 2s ease-in-out infinite" }} />
            )}
          </svg>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={handleStop}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}>
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>

          <button
            onClick={isRunning ? handlePause : handleStart}
            className="w-20 h-20 rounded-full flex items-center justify-center transition-all"
            style={{
              background: `linear-gradient(135deg, ${config.color}20, ${config.color}10)`,
              border: `2px solid ${config.color}`,
              color: config.color,
              boxShadow: isRunning ? `0 0 30px ${config.glow}` : "none",
            }}>
            {isRunning ? (
              <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          <button onClick={() => { handleStop(); setTimeLeft(totalDuration); }}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            style={{ background: "rgba(110,231,247,0.08)", border: "1px solid var(--border-default)", color: "rgba(226,232,240,0.4)" }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          </button>
        </div>

        {/* Custom duration */}
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-40" style={{ fontFamily: "JetBrains Mono, monospace" }}>Custom:</span>
          {[15, 25, 45, 60].map((m) => (
            <button key={m} onClick={() => { setCustomMinutes(m); setTimeLeft(m * 60); if (!isRunning) setTimeLeft(m * 60); }}
              className="px-2.5 py-1 rounded-md text-xs font-mono transition-all"
              style={{
                background: customMinutes === m ? "rgba(110,231,247,0.15)" : "var(--bg-700)",
                border: `1px solid ${customMinutes === m ? "rgba(110,231,247,0.4)" : "var(--border-subtle)"}`,
                color: customMinutes === m ? "#6ee7f7" : "rgba(226,232,240,0.4)",
              }}>
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel: Task Select + Log */}
      <div className="w-full lg:w-72 flex flex-col gap-4">
        {/* Task selector */}
        <div className="card rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#6ee7f7", fontFamily: "Syne, sans-serif" }}>
            เชื่อมกับ Task
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <button onClick={() => setSelectedTaskId(null)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
              style={{
                background: !selectedTaskId ? "rgba(110,231,247,0.08)" : "transparent",
                border: `1px solid ${!selectedTaskId ? "rgba(110,231,247,0.3)" : "transparent"}`,
                color: !selectedTaskId ? "#6ee7f7" : "rgba(226,232,240,0.4)",
                fontFamily: "JetBrains Mono, monospace",
              }}>
              — ไม่เลือก Task
            </button>
            {tasks.map((task) => (
              <button key={task.id} onClick={() => setSelectedTaskId(task.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                style={{
                  background: selectedTaskId === task.id ? "rgba(110,231,247,0.08)" : "transparent",
                  border: `1px solid ${selectedTaskId === task.id ? "rgba(110,231,247,0.3)" : "transparent"}`,
                  color: selectedTaskId === task.id ? "#6ee7f7" : "rgba(226,232,240,0.5)",
                }}>
                <div className="font-medium truncate">{task.title}</div>
                {task.totalTime > 0 && (
                  <div className="opacity-40 mt-0.5" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem" }}>
                    ⏱ {Math.floor(task.totalTime / 60)}h {task.totalTime % 60}m
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Session Log */}
        <div className="card rounded-xl p-4 flex-1">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#6ee7f7", fontFamily: "Syne, sans-serif" }}>
            กิจกรรม วันนี้
          </h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {todaySessions.length === 0 && (
              <p className="text-xs opacity-30 text-center py-4" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                ยังไม่มี session
              </p>
            )}
            {[...todaySessions].reverse().map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: s.type === "work" ? (s.completed ? "#4ade80" : "#6ee7f7") : "#a78bfa" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate" style={{ color: "rgba(226,232,240,0.6)" }}>
                    {s.task?.title || (s.type === "work" ? "Focus" : "Break")}
                  </div>
                </div>
                <span className="text-xs shrink-0" style={{ fontFamily: "JetBrains Mono, monospace", color: "rgba(226,232,240,0.3)" }}>
                  {s.duration}m
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
