"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message === "User already registered"
        ? "อีเมลนี้มีบัญชีอยู่แล้ว"
        : error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 grid-bg"
        style={{ background: "var(--bg-900)" }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.4)" }}>
            <span className="text-2xl">✉️</span>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "Syne, sans-serif", color: "#4ade80" }}>
            ตรวจสอบอีเมลของคุณ
          </h2>
          <p className="text-sm opacity-50 mb-6" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            ส่งลิงก์ยืนยันไปที่ {email} แล้ว
            กรุณาคลิกลิงก์ในอีเมลเพื่อเปิดใช้งานบัญชี
          </p>
          <a href="/login" className="text-sm underline" style={{ color: "#6ee7f7" }}>
            กลับไปหน้าเข้าสู่ระบบ
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-bg"
      style={{ background: "var(--bg-900)" }}>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, #6ee7f7, #a78bfa)", boxShadow: "0 0 30px rgba(110,231,247,0.4)" }}>
            <span className="text-black font-bold text-2xl" style={{ fontFamily: "Syne, sans-serif" }}>F</span>
          </div>
          <h1 className="text-2xl font-bold tracking-widest" style={{ fontFamily: "Syne, sans-serif", color: "#6ee7f7" }}>
            FlowOS
          </h1>
          <p className="text-xs mt-1 opacity-40" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            Personal Productivity Dashboard
          </p>
        </div>

        <div className="rounded-2xl p-6"
          style={{ background: "rgba(13,13,24,0.9)", border: "1px solid var(--border-default)", boxShadow: "0 0 60px rgba(167,139,250,0.06)" }}>
          <h2 className="text-lg font-semibold mb-5" style={{ fontFamily: "Syne, sans-serif" }}>
            สมัครสมาชิก
          </h2>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg text-sm"
              style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs block mb-1.5 opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>อีเมล</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-800)", border: "1px solid var(--border-default)", color: "#e2e8f0" }} />
            </div>
            <div>
              <label className="text-xs block mb-1.5 opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>รหัสผ่าน</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร" required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-800)", border: "1px solid var(--border-default)", color: "#e2e8f0" }} />
            </div>
            <div>
              <label className="text-xs block mb-1.5 opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>ยืนยันรหัสผ่าน</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••" required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-800)", border: "1px solid var(--border-default)", color: "#e2e8f0" }} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all mt-2"
              style={{
                background: "linear-gradient(135deg, rgba(110,231,247,0.2), rgba(167,139,250,0.2))",
                border: "1px solid rgba(110,231,247,0.4)",
                color: "#6ee7f7",
                opacity: loading ? 0.6 : 1,
              }}>
              {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            <span className="text-xs opacity-30" style={{ fontFamily: "JetBrains Mono, monospace" }}>หรือ</span>
            <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
          </div>       

          <p className="text-center text-xs mt-4 opacity-50">
            มีบัญชีอยู่แล้ว?{" "}
            <a href="/login" className="underline" style={{ color: "#6ee7f7" }}>เข้าสู่ระบบ</a>
          </p>
        </div>
      </div>
    </div>
  );
}
