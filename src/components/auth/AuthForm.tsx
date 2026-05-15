"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Eye, EyeOff, Loader2, Check, X } from "lucide-react"
import { api } from "@/lib/api"
import { setAuthToken } from "@/lib/auth"
import { cn } from "@/lib/utils"

type AuthMode = "login" | "register"

// ─── Password rules ───────────────────────────────────────

interface PasswordRule {
  id: string
  label: string
  test: (pw: string) => boolean
}

const PASSWORD_RULES: PasswordRule[] = [
  { id: "length",    label: "Minimal 8 karakter",  test: pw => pw.length >= 8 },
  { id: "upper",     label: "Ada huruf besar (A-Z)", test: pw => /[A-Z]/.test(pw) },
  { id: "lower",     label: "Ada huruf kecil (a-z)", test: pw => /[a-z]/.test(pw) },
  { id: "digit",     label: "Ada angka (0-9)",        test: pw => /\d/.test(pw) },
]

function isPasswordValid(pw: string) {
  return PASSWORD_RULES.every(r => r.test(pw))
}

// ─── Smart redirect helper ────────────────────────────────

async function smartRedirect() {
  try {
    const invitations = await api.listInvitations()
    if (invitations.length === 0) {
      window.location.href = "/dashboard/templates"
    } else {
      window.location.href = `/dashboard/editor/${invitations[0].id}`
    }
  } catch (err) {
    // 401 = sesi tidak valid → paksa login ulang
    if (err instanceof Error && (err.message.includes("UNAUTHORIZED") || (err as {code?: string}).code === "UNAUTHORIZED")) {
      window.location.href = "/auth/login"
      return
    }
    // Error lain (network, dsb) → fallback ke template picker
    window.location.href = "/dashboard/templates"
  }
}

// ─── Component ────────────────────────────────────────────

export default function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Real-time password validation
  const passwordRuleResults = useMemo(
    () => PASSWORD_RULES.map(rule => ({ ...rule, passed: rule.test(password) })),
    [password]
  )
  const passwordValid = isPasswordValid(password)
  const showPasswordChecklist = mode === "register" && (passwordFocused || password.length > 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    // Client-side password validation untuk register
    if (mode === "register" && !passwordValid) {
      setError("Password belum memenuhi semua persyaratan.")
      return
    }

    setLoading(true)
    try {
      if (mode === "register") {
        await api.register(email, password, name)
        // BE require email verification sebelum token aktif — selalu ke OTP page
        window.location.href = `/auth/verify-email?email=${encodeURIComponent(email)}`
        return
      } else {
        const { token } = await api.login(email, password)
        setAuthToken(token)
        await smartRedirect()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan"
      // Jika email belum verified → redirect ke OTP page
      if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("email verification")) {
        window.location.href = `/auth/verify-email?email=${encodeURIComponent(email)}`
        return
      }
      setError(translateAuthError(msg))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setError(null)
    setName("")
    setPassword("")
    setPasswordFocused(false)
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Mode tabs */}
      <div className="flex rounded-xl bg-stone-100 p-1 mb-6">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
            mode === "login"
              ? "bg-white text-stone-800 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          )}
        >
          Masuk
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
            mode === "register"
              ? "bg-white text-stone-800 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          )}
        >
          Daftar Gratis
        </button>
      </div>

      {/* Header subtitle */}
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <p className="text-sm text-stone-500">
          {mode === "login"
            ? "Kelola undangan digital kamu"
            : "Buat undangan pernikahan dalam 10 menit"}
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name — register only */}
        {mode === "register" && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-600">Nama Lengkap</label>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nama kamu"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            />
          </div>
        )}

        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-stone-600">Password</label>
            {/* FE-S02-4: Lupa Password link — hanya di mode login */}
            {mode === "login" && (
              <a
                href="/auth/forgot-password"
                className="text-xs text-amber-700 hover:underline"
              >
                Lupa Password?
              </a>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder="Minimal 8 karakter"
              className="w-full px-4 py-3 pr-10 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* FE-S02-2: Password checklist — hanya di register */}
          <AnimatePresence>
            {showPasswordChecklist && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <ul className="mt-2 space-y-1 px-1">
                  {passwordRuleResults.map(rule => (
                    <li key={rule.id} className="flex items-center gap-2 text-xs">
                      {rule.passed
                        ? <Check size={12} className="text-green-600 shrink-0" />
                        : <X size={12} className="text-stone-400 shrink-0" />
                      }
                      <span className={rule.passed ? "text-green-700" : "text-stone-400"}>
                        {rule.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error / Success */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"
          >
            {error}
          </motion.p>
        )}
        {successMsg && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg"
          >
            {successMsg}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={loading || (mode === "register" && !passwordValid)}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-opacity",
            "bg-amber-600 text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {mode === "login" ? "Masuk" : "Daftar"}
        </button>
      </form>

      {/* Toggle mode */}
      <p className="mt-5 text-center text-xs text-stone-400">
        {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
        <button
          onClick={() => switchMode(mode === "login" ? "register" : "login")}
          className="text-amber-700 hover:underline"
        >
          {mode === "login" ? "Daftar gratis" : "Masuk"}
        </button>
      </p>
    </div>
  )
}

// ─── Error translation ───────────────────────────────────

function translateAuthError(msg: string): string {
  if (msg.includes("invalid credentials") || msg.includes("wrong password") || msg.includes("not found"))
    return "Email atau password salah."
  if (msg.includes("already exists") || msg.includes("already registered"))
    return "Email sudah terdaftar. Silakan masuk."
  if (msg.includes("password") && msg.includes("8"))
    return "Password minimal 8 karakter."
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Terlalu banyak percobaan. Coba lagi beberapa menit."
  if (msg.includes("invalid email"))
    return "Format email tidak valid."
  return msg
}
