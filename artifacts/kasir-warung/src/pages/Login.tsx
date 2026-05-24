import { useState, useCallback, useEffect, useRef } from "react";
import { ShoppingCart, Eye, EyeOff, Lock, User, AlertCircle, ShieldAlert, Clock } from "lucide-react";
import { login } from "@/lib/auth";

interface LoginProps {
  onLogin: () => void;
  reason?: "expired" | "logout";
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default function Login({ onLogin, reason }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout] = useState(0);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (lockout > 0) {
      timerRef.current = setInterval(() => {
        setLockout(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setAttempts(0);
            setError("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [lockout > 0]);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockout > 0) return;
    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.");
      triggerShake();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ok = await login(username, password);
      if (ok) {
        onLogin();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        triggerShake();
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockout(LOCKOUT_SECONDS);
          setError(`Terlalu banyak percobaan gagal. Coba lagi dalam ${LOCKOUT_SECONDS} detik.`);
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          setError(`Username atau password salah. ${remaining} percobaan tersisa.`);
        }
        setPassword("");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }, [username, password, attempts, lockout, onLogin, triggerShake]);

  const isLocked = lockout > 0;

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-8px); }
          30%      { transform: translateX(7px); }
          45%      { transform: translateX(-6px); }
          60%      { transform: translateX(5px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(2px); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(20,184,166,0.4); }
          70%  { box-shadow: 0 0 0 14px rgba(20,184,166,0); }
          100% { box-shadow: 0 0 0 0 rgba(20,184,166,0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes errorPop {
          0%   { opacity:0; transform: scale(0.92) translateY(-6px); }
          100% { opacity:1; transform: scale(1) translateY(0); }
        }
        .anim-fadeslide { animation: fadeSlideUp 0.55s cubic-bezier(.22,.68,0,1.2) both; }
        .anim-fadeslide-delay { animation: fadeSlideUp 0.55s cubic-bezier(.22,.68,0,1.2) 0.12s both; }
        .anim-shake { animation: shake 0.6s ease; }
        .logo-pulse { animation: pulse-ring 2s ease-out infinite, float 3.5s ease-in-out infinite; }
        .loader-spin { animation: spin-slow 0.9s linear infinite; }
        .shimmer-btn {
          background: linear-gradient(90deg, #0d9488 0%, #14b8a6 40%, #2dd4bf 50%, #14b8a6 60%, #0d9488 100%);
          background-size: 200% auto;
          animation: shimmer 2.5s linear infinite;
        }
        .error-pop { animation: errorPop 0.2s ease both; }
        .glass-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .bg-dots {
          background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .input-glow:focus-within {
          box-shadow: 0 0 0 2px rgba(20,184,166,0.35);
          border-color: rgba(20,184,166,0.6);
        }
      `}</style>

      {/* Full-screen background */}
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#080c10]">

        {/* Background layers */}
        <div className="absolute inset-0 bg-dots opacity-100 pointer-events-none" />
        <div className="absolute top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-teal-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-cyan-500/8 blur-[100px] pointer-events-none" />
        <div className="absolute top-[40%] left-[60%] w-[25vw] h-[25vw] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

        {/* Card container */}
        <div
          className={`w-full max-w-sm relative z-10 transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}
          style={{ animation: mounted ? "fadeSlideUp 0.6s cubic-bezier(.22,.68,0,1.2) both" : "none" }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-7 anim-fadeslide">
            <div
              className="logo-pulse w-20 h-20 rounded-[22px] bg-primary flex items-center justify-center mb-4"
              style={{ boxShadow: "0 8px 32px rgba(20,184,166,0.35)" }}
            >
              <ShoppingCart className="w-10 h-10 text-black" strokeWidth={2.2} />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Kasir Warung</h1>
            <p className="text-sm text-white/40 mt-1 font-medium">
              {reason === "expired" ? "Sesi kadaluarsa — silakan masuk kembali" :
               reason === "logout" ? "Anda telah keluar" :
               "Panel admin — hanya untuk yang berwenang"}
            </p>
          </div>

          {/* Glass card */}
          <div
            className={`glass-card rounded-3xl p-7 shadow-2xl anim-fadeslide-delay ${shake ? "anim-shake" : ""}`}
            style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" }}
          >
            {/* Session expired banner */}
            {reason === "expired" && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5 mb-4 error-pop">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-300">Sesi 30 hari berakhir. Password sama, tidak perlu ganti.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Username field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Username</label>
                <div
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 input-glow transition-all"
                >
                  <User className="w-4 h-4 text-white/30 flex-shrink-0" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={isLocked || loading}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Password</label>
                <div
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 input-glow transition-all"
                >
                  <Lock className="w-4 h-4 text-white/30 flex-shrink-0" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
                    autoComplete="current-password"
                    disabled={isLocked || loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Attempts bar */}
              {attempts > 0 && !isLocked && (
                <div className="space-y-1 error-pop">
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Percobaan gagal</span>
                    <span>{attempts}/{MAX_ATTEMPTS}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(attempts / MAX_ATTEMPTS) * 100}%`,
                        background: attempts >= 4 ? "#ef4444" : attempts >= 3 ? "#f97316" : "#eab308",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div
                  key={error}
                  className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 error-pop ${
                    isLocked
                      ? "bg-red-500/15 border border-red-500/30"
                      : "bg-red-500/10 border border-red-500/20"
                  }`}
                >
                  {isLocked ? (
                    <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-red-300 leading-relaxed">
                      {isLocked ? `Akun dikunci sementara.` : error}
                    </p>
                    {isLocked && (
                      <p className="text-xs text-red-400 font-bold mt-0.5">
                        Coba lagi dalam {lockout} detik...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Lockout countdown ring */}
              {isLocked && (
                <div className="flex flex-col items-center py-2 gap-2 error-pop">
                  <div className="relative w-14 h-14">
                    <svg className="loader-spin w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" stroke="rgba(239,68,68,0.15)" strokeWidth="4" fill="none" />
                      <circle
                        cx="28" cy="28" r="24"
                        stroke="#ef4444"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 24}`}
                        strokeDashoffset={`${2 * Math.PI * 24 * (lockout / LOCKOUT_SECONDS)}`}
                        strokeLinecap="round"
                        style={{ animation: "none", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-red-400">{lockout}</span>
                  </div>
                  <p className="text-xs text-white/30">Tunggu sebelum mencoba lagi</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || isLocked}
                className={`w-full h-12 rounded-xl font-bold text-sm text-black transition-all duration-300 flex items-center justify-center gap-2.5 mt-2
                  ${loading || isLocked
                    ? "bg-white/10 text-white/30 cursor-not-allowed"
                    : "shimmer-btn hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                style={!loading && !isLocked ? { boxShadow: "0 4px 20px rgba(20,184,166,0.4)" } : {}}
              >
                {loading ? (
                  <>
                    <svg className="loader-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round" />
                    </svg>
                    <span className="text-white/70">Memverifikasi...</span>
                  </>
                ) : isLocked ? (
                  <span>Terkunci ({lockout}s)</span>
                ) : (
                  "Masuk"
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-4 mt-5">
            <div className="flex-1 h-px bg-white/5" />
            <p className="text-xs text-white/20 whitespace-nowrap">Sesi aktif 30 hari</p>
            <div className="flex-1 h-px bg-white/5" />
          </div>
        </div>
      </div>
    </>
  );
}
