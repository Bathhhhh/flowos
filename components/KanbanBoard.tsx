"use client";
import { useState, useEffect, useRef } from "react";

type Priority = "low" | "medium" | "high";
type Status = "todo" | "inprogress" | "done";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  tags: string[];
  priority: Priority;
  order: number;
  totalTime: number;
  createdAt: string;
}

const COLUMNS: { id: Status; label: string; color: string; glow: string }[] = [
  { id: "todo", label: "To Do", color: "#6ee7f7", glow: "rgba(110,231,247,0.2)" },
  { id: "inprogress", label: "In Progress", color: "#fb923c", glow: "rgba(251,146,60,0.2)" },
  { id: "done", label: "Done", color: "#4ade80", glow: "rgba(74,222,128,0.2)" },
];

const PRIORITY_CONFIG = {
  high: { color: "#f87171", label: "HIGH", dot: "bg-red-400" },
  medium: { color: "#fb923c", label: "MED", dot: "bg-orange-400" },
  low: { color: "#6ee7f7", label: "LOW", dot: "bg-cyan-400" },
};

const TAG_PRESETS = [
  { label: "วิชา Project", color: "#a78bfa" },
  { label: "ส่วนตัว", color: "#6ee7f7" },
  { label: "งานบ้าน", color: "#4ade80" },
  { label: "เรียน", color: "#fb923c" },
  { label: "ซื้อของ", color: "#facc15" },
];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<Status | null>(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" as Priority, tags: [] as string[], status: "todo" as Status });

  useEffect(() => { fetchTasks(); }, []);

  async function fetchTasks() {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.error("API /tasks returned non-array:", data);
        setTasks([]);
        return;
      }
      // Sort แยกตาม column แล้ว concat กัน — ไม่ขึ้นกับ DB collation ภาษาไทย
      const STATUS_ORDER = ["todo", "inprogress", "done"];
      const sorted = [...data].sort((a, b) => {
        const statusDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
        if (statusDiff !== 0) return statusDiff;
        return a.order - b.order; // ใช้ตัวเลขเปรียบเทียบ ไม่ใช้ string
      });
      setTasks(sorted);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function createTask() {
    if (!form.title.trim()) return;
    const colCount = tasks.filter((t) => t.status === form.status).length;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, order: colCount }),
    });
    const task = await res.json();
    setTasks((prev) => [...prev, task]);
    setForm({ title: "", description: "", priority: "medium", tags: [], status: "todo" });
    setShowForm(false);
  }

  async function updateTask(id: string, updates: Partial<Task>) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  // Drag and drop
  function onDragStart(e: React.DragEvent, id: string) {
    // dataTransfer.setData ถูก set ใน TaskCard แล้ว ที่นี่แค่ set state
    setDraggingId(id);
  }

  function onDragEnd() {
    setDraggingId(null);
    setOverColumn(null);
  }

  function onDragOver(e: React.DragEvent, col: Status) {
    e.preventDefault();
    setOverColumn(col);
  }

  async function onDrop(e: React.DragEvent, targetStatus: Status) {
    e.preventDefault();
    e.stopPropagation();

    const id = e.dataTransfer.getData("taskId");
    if (!id || id.trim() === "") return;

    const taskToMove = tasks.find((t) => t.id === id);
    if (!taskToMove || taskToMove.status === targetStatus) {
      setDraggingId(null);
      setOverColumn(null);
      return;
    }

    const sourceStatus = taskToMove.status;

    // 1. สร้าง updated tasks array
    //    - ลบ task ออกจาก source column แล้ว reassign order ใหม่
    //    - เพิ่ม task ต่อท้าย target column
    const sourceTasks = tasks
      .filter((t) => t.status === sourceStatus && t.id !== id)
      .sort((a, b) => a.order - b.order)
      .map((t, i) => ({ ...t, order: i })); // reassign order 0,1,2...

    const targetTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== id)
      .sort((a, b) => a.order - b.order)
      .map((t, i) => ({ ...t, order: i })); // reassign order 0,1,2...

    const movedTask = { ...taskToMove, status: targetStatus, order: targetTasks.length };

    const otherTasks = tasks.filter(
      (t) => t.status !== sourceStatus && t.status !== targetStatus
    );

    const updatedTasks = [...otherTasks, ...sourceTasks, ...targetTasks, movedTask];
    setTasks(updatedTasks);
    setDraggingId(null);
    setOverColumn(null);

    // 2. บันทึก DB — save task ที่ย้ายก่อน แล้วค่อย save order ของที่เหลือ
    const saves = [
      fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, order: movedTask.order }),
      }),
      // reassign order ของ source column
      ...sourceTasks.map((t) =>
        fetch(`/api/tasks/${t.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: t.order }),
        })
      ),
    ];

    Promise.all(saves).catch(console.error);
  }

  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  }

  function formatTime(minutes: number) {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}ชม ${m}น` : `${m}น`;
  }

  // Sort by order field — ไม่ขึ้นกับภาษาหรือ alphabetical sort
  const columnTasks = (status: Status) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.order - b.order);

  return (
    <div className="h-full flex flex-col p-6 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif", color: "#6ee7f7" }}>
            Kanban Board
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(226,232,240,0.4)", fontFamily: "JetBrains Mono, monospace" }}>
            {tasks.length} tasks · {tasks.filter(t => t.status === "done").length} done
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(110,231,247,0.15), rgba(167,139,250,0.15))",
            border: "1px solid rgba(110,231,247,0.3)",
            color: "#6ee7f7",
            boxShadow: "0 0 20px rgba(110,231,247,0.1)",
          }}
        >
          <span className="text-lg leading-none">+</span> Task ใหม่
        </button>
      </div>

      {/* Columns */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm opacity-30" style={{ fontFamily: "JetBrains Mono, monospace" }}>Loading...</div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
          {COLUMNS.map((col) => {
            const colTasks = columnTasks(col.id);
            const isOver = overColumn === col.id;
            return (
              <div
                key={col.id}
                onDragOver={(e) => onDragOver(e, col.id)}
                onDrop={(e) => onDrop(e, col.id)}
                className="flex flex-col rounded-xl transition-all duration-200"
                style={{
                  background: "rgba(13,13,24,0.6)",
                  border: `1px solid ${isOver ? col.color : "var(--border-subtle)"}`,
                  boxShadow: isOver ? `0 0 24px ${col.glow}` : "none",
                }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color, boxShadow: `0 0 6px ${col.color}` }} />
                    <span className="text-sm font-semibold tracking-wide" style={{ color: col.color }}>{col.label}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono"
                    style={{ background: `${col.color}15`, color: col.color, border: `1px solid ${col.color}30` }}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isDragging={draggingId === task.id}
                      onDragStart={(e) => onDragStart(e, task.id)}
                      onDragEnd={onDragEnd}
                      onDelete={() => deleteTask(task.id)}
                      onEdit={() => { setEditTask(task); setShowForm(true); setForm({ title: task.title, description: task.description || "", priority: task.priority, tags: task.tags, status: task.status }); }}
                      formatTime={formatTime}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 rounded-lg border-dashed border opacity-30"
                      style={{ borderColor: col.color }}>
                      <span className="text-xs" style={{ fontFamily: "JetBrains Mono, monospace", color: col.color }}>Drop here</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditTask(null); } }}>
          <div className="w-full max-w-md rounded-2xl p-6 animate-slide-in"
            style={{ background: "var(--bg-700)", border: "1px solid var(--border-default)", boxShadow: "0 0 60px rgba(110,231,247,0.1)" }}>
            <h2 className="text-lg font-bold mb-5" style={{ fontFamily: "Syne, sans-serif", color: "#6ee7f7" }}>
              {editTask ? "แก้ไข Task" : "Task ใหม่"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>ชื่องาน</label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && (editTask ? updateTask(editTask.id, form).then(() => { setShowForm(false); setEditTask(null); }) : createTask())}
                  placeholder="ชื่องาน..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{ background: "var(--bg-800)", border: "1px solid var(--border-default)", color: "#e2e8f0" }}
                />
              </div>

              <div>
                <label className="text-xs mb-1.5 block opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>รายละเอียด</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="รายละเอียด (ไม่บังคับ)..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none transition-all"
                  style={{ background: "var(--bg-800)", border: "1px solid var(--border-default)", color: "#e2e8f0" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>Priority</label>
                  <div className="flex gap-1.5">
                    {(["low", "medium", "high"] as Priority[]).map((p) => (
                      <button key={p} onClick={() => setForm((f) => ({ ...f, priority: p }))}
                        className="flex-1 py-1.5 rounded-md text-xs font-mono transition-all"
                        style={{
                          background: form.priority === p ? `${PRIORITY_CONFIG[p].color}20` : "var(--bg-800)",
                          border: `1px solid ${form.priority === p ? PRIORITY_CONFIG[p].color : "var(--border-subtle)"}`,
                          color: form.priority === p ? PRIORITY_CONFIG[p].color : "rgba(226,232,240,0.4)",
                        }}>
                        {PRIORITY_CONFIG[p].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs mb-1.5 block opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))}
                    className="w-full px-3 py-1.5 rounded-md text-xs outline-none"
                    style={{ background: "var(--bg-800)", border: "1px solid var(--border-default)", color: "#e2e8f0" }}>
                    <option value="todo">To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs mb-1.5 block opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_PRESETS.map((tag) => (
                    <button key={tag.label} onClick={() => toggleTag(tag.label)}
                      className="tag-pill transition-all"
                      style={{
                        background: form.tags.includes(tag.label) ? `${tag.color}20` : "transparent",
                        borderColor: form.tags.includes(tag.label) ? tag.color : "var(--border-default)",
                        color: form.tags.includes(tag.label) ? tag.color : "rgba(226,232,240,0.5)",
                      }}>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowForm(false); setEditTask(null); }}
                className="flex-1 py-2.5 rounded-lg text-sm transition-all"
                style={{ background: "var(--bg-800)", border: "1px solid var(--border-subtle)", color: "rgba(226,232,240,0.5)" }}>
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (editTask) {
                    // ส่งเฉพาะ field ที่ user แก้ไข — ไม่ส่ง order/status ที่อาจทำให้เรียงใหม่
                    updateTask(editTask.id, {
                      title: form.title,
                      description: form.description,
                      priority: form.priority,
                      tags: form.tags,
                      // ส่ง status เฉพาะถ้าเปลี่ยนจริง และ recalculate order ให้ถูก
                      ...(form.status !== editTask.status && {
                        status: form.status,
                        order: tasks.filter((t) => t.status === form.status && t.id !== editTask.id).length,
                      }),
                    }).then(() => { setShowForm(false); setEditTask(null); });
                  } else { createTask(); }
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: "linear-gradient(135deg, rgba(110,231,247,0.2), rgba(167,139,250,0.2))",
                  border: "1px solid rgba(110,231,247,0.4)",
                  color: "#6ee7f7",
                  boxShadow: "0 0 16px rgba(110,231,247,0.15)",
                }}>
                {editTask ? "บันทึก" : "สร้าง Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, isDragging, onDragStart, onDragEnd, onDelete, onEdit, formatTime }: {
  task: Task;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDelete: () => void;
  onEdit: () => void;
  formatTime: (m: number) => string | null;
}) {
  const pc = PRIORITY_CONFIG[task.priority];
  const timeStr = formatTime(task.totalTime);

  return (
    <div
      draggable
      onDragStart={(e) => {
        // ใส่ id ลง dataTransfer ทันที ก่อน event bubble
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("taskId", task.id);
        onDragStart(e);
      }}
      onDragEnd={onDragEnd}
      className={`card card-hover rounded-xl p-3 cursor-grab active:cursor-grabbing ${isDragging ? "dragging" : ""} priority-${task.priority}`}
      style={{ background: "rgba(20,20,36,0.8)" }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium leading-snug flex-1"
          style={{ color: task.status === "done" ? "rgba(226,232,240,0.4)" : "#e2e8f0",
            textDecoration: task.status === "done" ? "line-through" : "none" }}>
          {task.title}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 rounded opacity-40 hover:opacity-100 transition-opacity"
            style={{ color: "#6ee7f7" }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded opacity-40 hover:opacity-100 transition-opacity"
            style={{ color: "#f87171" }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-xs mb-2 leading-relaxed" style={{ color: "rgba(226,232,240,0.4)" }}>
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => {
            const preset = [
              { label: "วิชา Project", color: "#a78bfa" },
              { label: "ส่วนตัว", color: "#6ee7f7" },
              { label: "งานบ้าน", color: "#4ade80" },
              { label: "เรียน", color: "#fb923c" },
              { label: "ซื้อของ", color: "#facc15" },
            ].find((p) => p.label === tag);
            const color = preset?.color || "#6ee7f7";
            return (
              <span key={tag} className="tag-pill"
                style={{ background: `${color}15`, borderColor: `${color}40`, color }}>
                {tag}
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {timeStr && (
            <span className="text-xs opacity-40" style={{ fontFamily: "JetBrains Mono, monospace" }}>⏱ {timeStr}</span>
          )}
          <span className="text-xs px-1.5 py-0.5 rounded font-mono"
            style={{ background: `${pc.color}15`, color: pc.color, fontSize: "0.6rem" }}>
            {pc.label}
          </span>
        </div>
      </div>
    </div>
  );
}
