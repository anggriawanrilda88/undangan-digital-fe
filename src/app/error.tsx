"use client"

import { useEffect } from "react"
import { RefreshCw } from "lucide-react"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Route-level error boundary.
 *
 * Khusus untuk "Failed to find Server Action": terjadi saat browser masih
 * load bundle lama setelah FE di-deploy ulang. Solusinya adalah hard-reload
 * halaman supaya browser ambil bundle terbaru.
 */
export default function Error({ error, reset }: ErrorProps) {
  const isStaleDeployment =
    error.message?.includes("Failed to find Server Action") ||
    error.message?.includes("Server Action") ||
    error.digest?.includes("ACTION")

  useEffect(() => {
    // Auto-reload sekali untuk stale deployment errors
    if (isStaleDeployment) {
      const alreadyReloaded = sessionStorage.getItem("sa_reload")
      if (!alreadyReloaded) {
        sessionStorage.setItem("sa_reload", "1")
        window.location.reload()
      }
    }
  }, [isStaleDeployment])

  if (isStaleDeployment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-4 max-w-xs px-4">
          <RefreshCw size={28} className="animate-spin text-amber-500 mx-auto" />
          <p className="text-sm text-stone-600">Memperbarui halaman...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center space-y-4 max-w-xs px-4">
        <p className="text-2xl">⚠️</p>
        <p className="text-sm font-medium text-stone-700">Terjadi kesalahan</p>
        <p className="text-xs text-stone-400">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Coba lagi
        </button>
      </div>
    </div>
  )
}
