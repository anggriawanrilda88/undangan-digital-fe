"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Eye, EyeOff, Loader2, Check, X, ArrowLeft, RefreshCw } from "lucide-react"
import { api, ApiException } from "@/lib/api"
import { setAuthToken } from "@/lib/auth"
import { cn } from "@/lib/utils"

type AuthMode = "login" | "register"
type AuthStep = "form" | "otp"

// ─── Password rules ───────────────────────────────────────

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

function isPasswordValid(pw: string) {
  return PASSWORD_RULES.every(r => r.test(pw))
}

// ─── Smart redirect ───────────────────────────────────────

async function smartRedirect() {
  try {
    const invitations = await api.listInvitations()
    if (invitations.length === 0) {
      window.location.href = "/dashboard/templates"
    } else {
      window.location.href = `/dashboard/editor/${invitations[0].id}`
    }
  } catch (err) {
    if (err instanceof Error && (err as { code?: string }).code === "UNAUTHORIZED") {
      window.location.href = "/auth/login"
      return
    }
    window.location.href = "/dashboard/templates"
  }
}

// ─── OTP Step (inline) ────────────────────────────────────

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60

function OtpStep({
  email,
  onVerified,
  onBack,
}: {
  email: string
  onVerified: () => void
  onBack: () => void
}) {
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN)
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(countdownRef.current!); return 0 }
        return c - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    startCountdown()
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [startCountdown])

  // Auto-submit setelah 6 digit terisi
  useEffect(() => {
    if (otp.length === OTP_LENGTH && !loading) {
      handleVerify(otp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  const handleOtpChange = (index: number, char: string) => {
    // Paste seluruh kode
    if (char.length > 1) {
      const digits = char.replace(/\D/g, "").slice(0, OTP_LENGTH)
      setOtp(digits)
      const lastIdx = Math.min(digits.length, OTP_LENGTH - 1)
      inputRefs.current[lastIdx]?.focus()
      return
    }
    const digit = char.replace(/\D/g, "")
    if (!digit && char) return
    const arr = (otp + "      ").slice(0, OTP_LENGTH).split("")
    arr[index] = digit
    const next = arr.join("").trimEnd()
    setOtp(next)
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const arr = (otp + "      ").slice(0, OTP_LENGTH).split("")
        arr[index - 1] = ""
        setOtp(arr.join("").trimEnd())
        inputRefs.current[index - 1]?.focus()
      } else {
        const arr = (otp + "      ").slice(0, OTP_LENGTH).split("")
        arr[index] = ""
        setOtp(arr.join("").trimEnd())
      }
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus()
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleVerify = async (code: string) => {
    if (code.length !== OTP_LENGTH || loading) return
    setError(null)
    setLoading(true)
    try {
      const result = await api.verifyEmail(email, code)
      setAuthToken(result.accessToken)
      onVerified()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kode tidak valid"
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("kedaluwarsa")) {
        setError("Kode sudah kedaluwarsa. Minta kode baru.")
      } else {
        setError("Kode tidak valid. Cek kembali dan coba lagi.")
      }
      setOtp("")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || resending) return
    setResendMsg(null)
    setError(null)
    setResending(true)
    try {
      await api.resendOtp(email)
      setResendMsg("Kode baru sudah dikirim.")
      startCountdown()
      setOtp("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal kirim ulang kode.")
    } finally {
      setResending(false)
    }
  }

  return (
    <motion.div
      key="otp-step"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="text-3xl mb-2">📧</div>
        <h2 className="font-semibold text-stone-800 text-base">Cek email kamu</h2>
        <p className="text-xs text-stone-500">
          Kami kirim kode 6 angka ke{" "}
          <span className="font-medium text-stone-700 break-all">{email}</span>
        </p>
      </div>

      {/* OTP inputs */}
      <div className="flex gap-2 justify-center">
        {Array.from({ length: OTP_LENGTH }).map((_, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otp[i] ?? ""}
            onChange={e => handleOtpChange(i, e.target.value)}
            onKeyDown={e => handleOtpKeyDown(i, e)}
            onPaste={e => { e.preventDefault(); handleOtpChange(i, e.clipboardData.getData("text")) }}
            autoFocus={i === 0}
            disabled={loading}
            className="w-10 h-12 text-center text-lg font-bold rounded-xl border-2 border-stone-200 text-stone-900 bg-white focus:outline-none focus:border-amber-400 disabled:opacity-50 transition-colors"
          />
        ))}
      </div>

      {/* Error / resend msg */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg text-center"
          >
            {error}
          </motion.p>
        )}
        {resendMsg && !error && (
          <motion.p
            key="resend"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg text-center"
          >
            {resendMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Verify button */}
      <button
        onClick={() => handleVerify(otp)}
        disabled={otp.length !== OTP_LENGTH || loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        Verifikasi
      </button>

      {/* Resend + back */}
      <div className="flex items-center justify-between text-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-stone-400 hover:text-stone-700 transition-colors"
        >
          <ArrowLeft size={12} />
          Kembali
        </button>

        {countdown > 0 ? (
          <span className="text-stone-400">
            Kirim ulang dalam <span className="font-medium text-stone-600">{countdown}s</span>
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1 text-amber-700 hover:underline disabled:opacity-50"
          >
            <RefreshCw size={11} className={resending ? "animate-spin" : ""} />
            {resending ? "Mengirim..." : "Kirim ulang kode"}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main AuthForm ────────────────────────────────────────

export default function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [step, setStep] = useState<AuthStep>("form")
  const [registeredEmail, setRegisteredEmail] = useState("")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordRuleResults = useMemo(
    () => PASSWORD_RULES.map(rule => ({ ...rule, passed: rule.test(password) })),
    [password]
  )
  const passwordValid = isPasswordValid(password)
  const showPasswordChecklist = mode === "register" && (passwordFocused || password.length > 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === "register" && !passwordValid) {
      setError("Password belum memenuhi semua persyaratan.")
      return
    }

    setLoading(true)
    try {
      if (mode === "register") {
        await api.register(email, password, name)
        // Pindah ke step OTP inline — jangan redirect
        setRegisteredEmail(email)
        setStep("otp")
      } else {
        const { accessToken } = await api.login(email, password)
        setAuthToken(accessToken)
        await smartRedirect()
      }
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        // 403 EMAIL_NOT_VERIFIED — redirect ke halaman verify-email
        if (err.code === "EMAIL_NOT_VERIFIED") {
          window.location.href = `/auth/verify-email?email=${encodeURIComponent(email)}`
          return
        }
        setError(translateAuthError(err.message))
      } else {
        setError("Terjadi kesalahan. Coba lagi.")
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setStep("form")
    setError(null)
    setName("")
    setPassword("")
    setPasswordFocused(false)
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Mode tabs — hanya tampil di step form */}
      {step === "form" && (
        <div className="flex rounded-xl bg-stone-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
              mode === "login" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
            )}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
              mode === "register" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
            )}
          >
            Daftar Gratis
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "otp" ? (
          <OtpStep
            key="otp"
            email={registeredEmail}
            onVerified={smartRedirect}
            onBack={() => { setStep("form"); setError(null) }}
          />
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.2 }}
          >
            {/* Subtitle */}
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
                  {mode === "login" && (
                    <a href="/auth/forgot-password" className="text-xs text-amber-700 hover:underline">
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

                {/* Password checklist */}
                <AnimatePresence>
                  {showPasswordChecklist && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-2 space-y-1 px-1"
                    >
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
                    </motion.ul>
                  )}
                </AnimatePresence>
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
                disabled={loading || (mode === "register" && !passwordValid)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm bg-amber-600 text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {mode === "login" ? "Masuk" : "Daftar"}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-stone-400">
              {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
              <button
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="text-amber-700 hover:underline"
              >
                {mode === "login" ? "Daftar gratis" : "Masuk"}
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
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
