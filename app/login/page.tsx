"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
        : error.message);
    } else {
      router.push("/");
      router.refresh();
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-bg"
      style={{ background: "var(--bg-900)" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #6ee7f7, transparent 70%)", filter: "blur(60px)" }} />
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

        {/* Card */}
        <div className="rounded-2xl p-6"
          style={{ background: "rgba(13,13,24,0.9)", border: "1px solid var(--border-default)", boxShadow: "0 0 60px rgba(110,231,247,0.06)" }}>
          <h2 className="text-lg font-semibold mb-5" style={{ fontFamily: "Syne, sans-serif" }}>
            เข้าสู่ระบบ
          </h2>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg text-sm"
              style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs block mb-1.5 opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                อีเมล
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{ background: "var(--bg-800)", border: "1px solid var(--border-default)", color: "#e2e8f0" }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1.5 opacity-50" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                รหัสผ่าน
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{ background: "var(--bg-800)", border: "1px solid var(--border-default)", color: "#e2e8f0" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all mt-2"
              style={{
                background: "linear-gradient(135deg, rgba(110,231,247,0.2), rgba(167,139,250,0.2))",
                border: "1px solid rgba(110,231,247,0.4)",
                color: "#6ee7f7",
                boxShadow: "0 0 20px rgba(110,231,247,0.1)",
                opacity: loading ? 0.6 : 1,
              }}>
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            <span className="text-xs opacity-30" style={{ fontFamily: "JetBrains Mono, monospace" }}>หรือ</span>
            <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
          </div>

          {/* Register link */}
          <p className="text-center text-xs mt-4 opacity-50">
            ยังไม่มีบัญชี?{" "}
            <a href="/register" className="underline transition-opacity hover:opacity-100"
              style={{ color: "#6ee7f7" }}>
              สมัครสมาชิก
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
