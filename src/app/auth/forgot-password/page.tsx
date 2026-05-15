"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.forgotPassword(email)
      // Selalu tampilkan sukses — jangan expose apakah email terdaftar atau tidak
      setSent(true)
    } catch (err) {
      // Tetap tampilkan sukses meski error (security best practice)
      // Kecuali error non-auth (rate limit, dsb.)
      const msg = err instanceof Error ? err.message : ""
      if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many")) {
        setError("Terlalu banyak permintaan. Coba lagi beberapa menit.")
      } else {
        setSent(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <span className="text-3xl">💍</span>
          <p className="mt-2 text-sm font-medium text-stone-500 tracking-wide">Undangan Digital</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 px-6 py-8">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <CheckCircle2 size={40} className="text-green-500 mx-auto" />
              <h2 className="text-xl font-bold text-stone-800">Cek email kamu!</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                Kalau email <span className="font-medium text-stone-700">{email}</span> terdaftar, kami akan kirimkan link untuk reset password.
              </p>
              <p className="text-xs text-stone-400">
                Tidak ada email masuk? Cek folder spam, atau{" "}
                <button onClick={() => setSent(false)} className="text-amber-700 hover:underline">
                  coba lagi
                </button>.
              </p>
              <a
                href="/auth/login"
                className="flex items-center gap-1 justify-center text-xs text-stone-400 hover:text-stone-600 transition-colors mt-4"
              >
                <ArrowLeft size={12} />
                Kembali ke halaman masuk
              </a>
            </motion.div>
          ) : (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-stone-800">Lupa Password?</h1>
                <p className="text-sm text-stone-500">
                  Masukkan email kamu dan kami akan kirimkan link untuk reset password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600">Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="kamu@email.com"
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                  </div>
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
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 text-white font-medium text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  Kirim Link Reset
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
          )}
        </div>
      </div>
    </main>
  )
}
