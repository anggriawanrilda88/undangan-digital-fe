"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, RefreshCw, ArrowLeft, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api"
import { setAuthToken } from "@/lib/auth"

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60

// ─── Smart redirect ───────────────────────────────────────

async function smartRedirect() {
  try {
    const invitations = await api.listInvitations()
    if (invitations.length === 0) {
      window.location.href = "/dashboard/templates"
    } else {
      window.location.href = `/dashboard/editor/${invitations[0].id}`
    }
  } catch {
    window.location.href = "/dashboard"
  }
}

// ─── OTP Input Component ──────────────────────────────────

function OtpInputs({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const handleChange = (index: number, char: string) => {
    // Paste handling — kalau paste 6 digit sekaligus
    if (char.length > 1) {
      const digits = char.replace(/\D/g, "").slice(0, OTP_LENGTH)
      onChange(digits)
      // Focus ke input terakhir yang terisi
      const lastIdx = Math.min(digits.length, OTP_LENGTH - 1)
      inputRefs.current[lastIdx]?.focus()
      return
    }
    const digit = char.replace(/\D/g, "")
    if (!digit && char) return // non-digit key, ignore

    const arr = value.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH)
    arr[index] = digit
    const next = arr.join("").replace(/\s/g, "")
    onChange(next)

    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        const arr = value.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH)
        arr[index - 1] = ""
        onChange(arr.join(""))
        inputRefs.current[index - 1]?.focus()
      } else {
        const arr = value.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH)
        arr[index] = ""
        onChange(arr.join(""))
      }
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus()
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={e => {
            e.preventDefault()
            handleChange(i, e.clipboardData.getData("text"))
          }}
          disabled={disabled}
          className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 border-stone-200 text-stone-900 bg-white focus:outline-none focus:border-amber-400 disabled:opacity-50 transition-colors"
        />
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""

  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)

  // Resend countdown
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN)
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownRef.current!)
          return 0
        }
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
    if (otp.length === OTP_LENGTH && !loading && !verified) {
      handleVerify(otp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  const handleVerify = async (code: string) => {
    if (code.length !== OTP_LENGTH || loading) return
    setError(null)
    setLoading(true)
    try {
      const result = await api.verifyEmail(email, code)
      setAuthToken(result.accessToken)
      setVerified(true)
      setTimeout(() => smartRedirect(), 1200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kode tidak valid"
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("kedaluwarsa")) {
        setError("Kode sudah kedaluwarsa. Minta kode baru.")
      } else {
        setError("Kode tidak valid. Cek kembali dan coba lagi.")
      }
      setOtp("") // reset OTP input
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
      setResendMsg("Kode baru sudah dikirim ke email kamu.")
      startCountdown()
      setOtp("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal kirim ulang kode.")
    } finally {
      setResending(false)
    }
  }

  if (verified) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-3"
      >
        <CheckCircle2 size={48} className="text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-stone-800">Email terverifikasi!</h2>
        <p className="text-sm text-stone-500">Mengalihkan ke dashboard...</p>
        <Loader2 size={18} className="animate-spin text-amber-500 mx-auto" />
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">📧</div>
        <h1 className="text-2xl font-bold text-stone-800">Cek email kamu</h1>
        <p className="text-sm text-stone-500">
          Kami kirim kode 6 angka ke
        </p>
        <p className="text-sm font-medium text-stone-800 break-all">{email || "email kamu"}</p>
      </div>

      {/* OTP inputs */}
      <OtpInputs value={otp} onChange={setOtp} disabled={loading || verified} />

      {/* Error / resend message */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg text-center"
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
            className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg text-center"
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
        {loading && <Loader2 size={15} className="animate-spin" />}
        Verifikasi
      </button>

      {/* Resend */}
      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-xs text-stone-400">
            Kirim ulang kode dalam <span className="font-medium text-stone-600">{countdown}s</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1.5 mx-auto text-xs text-amber-700 hover:underline disabled:opacity-50"
          >
            <RefreshCw size={12} className={resending ? "animate-spin" : ""} />
            {resending ? "Mengirim..." : "Kirim ulang kode"}
          </button>
        )}
      </div>

      {/* Back to register */}
      <div className="text-center">
        <a
          href="/auth/login"
          className="flex items-center gap-1 justify-center text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          <ArrowLeft size={12} />
          Ganti email / kembali ke daftar
        </a>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
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
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
