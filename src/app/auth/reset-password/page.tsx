"use client"

import { useState, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2, Check, X, ArrowLeft, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

// ─── Password rules (sama dengan AuthForm) ───────────────

interface PasswordRule {
  id: string
  label: string
  test: (pw: string) => boolean
}

const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "Minimal 8 karakter",   test: pw => pw.length >= 8 },
  { id: "upper",  label: "Ada huruf besar (A-Z)", test: pw => /[A-Z]/.test(pw) },
  { id: "lower",  label: "Ada huruf kecil (a-z)", test: pw => /[a-z]/.test(pw) },
  { id: "digit",  label: "Ada angka (0-9)",        test: pw => /\d/.test(pw) },
]

// ─── Reset Form ───────────────────────────────────────────

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const passwordRuleResults = useMemo(
    () => PASSWORD_RULES.map(r => ({ ...r, passed: r.test(password) })),
    [password]
  )
  const passwordValid = PASSWORD_RULES.every(r => r.test(password))
  const confirmMatch = password === confirm && confirm.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError("Token reset tidak valid. Minta link reset baru.")
      return
    }
    if (!passwordValid) {
      setError("Password belum memenuhi semua persyaratan.")
      return
    }
    if (!confirmMatch) {
      setError("Password dan konfirmasi tidak sama.")
      return
    }

    setLoading(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan"
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid token")) {
        setError("Link reset sudah kedaluwarsa atau tidak valid. Minta link baru.")
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">🔗</div>
        <h2 className="text-lg font-bold text-stone-800">Link tidak valid</h2>
        <p className="text-sm text-stone-500">Link reset password tidak valid atau sudah kedaluwarsa.</p>
        <a
          href="/auth/forgot-password"
          className="inline-block text-sm text-amber-700 hover:underline"
        >
          Minta link baru
        </a>
      </div>
    )
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        <CheckCircle2 size={40} className="text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-stone-800">Password berhasil direset!</h2>
        <p className="text-sm text-stone-500">Sekarang kamu bisa masuk dengan password baru.</p>
        <a
          href="/auth/login"
          className="inline-block w-full text-center py-3 rounded-xl bg-amber-600 text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Masuk Sekarang
        </a>
      </motion.div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-stone-800">Reset Password</h1>
        <p className="text-sm text-stone-500">Buat password baru untuk akunmu.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Password baru */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Password Baru</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoFocus
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
          {/* Password checklist */}
          {password.length > 0 && (
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
          )}
        </div>

        {/* Konfirmasi password */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Konfirmasi Password</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Ketik ulang password baru"
              className={cn(
                "w-full px-4 py-3 pr-10 rounded-xl border text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white",
                confirm.length > 0
                  ? confirmMatch ? "border-green-400" : "border-red-300"
                  : "border-stone-200"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {confirm.length > 0 && !confirmMatch && (
            <p className="text-xs text-red-500 mt-1">Password tidak sama</p>
          )}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"
          >
            {error}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={loading || !passwordValid || !confirmMatch}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 text-white font-medium text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          Reset Password
        </button>
      </form>

      <div className="text-center">
        <a
          href="/auth/login"
          className="flex items-center gap-1 justify-center text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          <ArrowLeft size={12} />
          Kembali ke halaman masuk
        </a>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl">💍</span>
          <p className="mt-2 text-sm font-medium text-stone-500 tracking-wide">Undangan Digital</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 px-6 py-8">
          <Suspense fallback={
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-amber-500" />
            </div>
          }>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
