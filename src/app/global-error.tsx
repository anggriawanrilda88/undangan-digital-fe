"use client"

import { useEffect } from "react"
import { RefreshCw } from "lucide-react"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const isStaleDeployment =
    error.message?.includes("Failed to find Server Action") ||
    error.message?.includes("Server Action") ||
    error.digest?.includes("ACTION")

  useEffect(() => {
    if (isStaleDeployment) {
      const alreadyReloaded = sessionStorage.getItem("sa_reload_global")
      if (!alreadyReloaded) {
        sessionStorage.setItem("sa_reload_global", "1")
        window.location.reload()
      }
    }
  }, [isStaleDeployment])

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-4 max-w-xs px-4">
          {isStaleDeployment ? (
            <>
              <RefreshCw size={28} className="animate-spin text-amber-500 mx-auto" />
              <p className="text-sm text-stone-600">Memperbarui halaman...</p>
            </>
          ) : (
            <>
              <p className="text-2xl">⚠️</p>
              <p className="text-sm font-medium text-stone-700">Terjadi kesalahan tak terduga</p>
              <p className="text-xs text-stone-400">{error.message}</p>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Coba lagi
              </button>
            </>
          )}
        </div>
      </body>
    </html>
  )
}
