"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, Loader2, ChevronLeft, LogOut } from "lucide-react"
import TemplatePicker from "@/components/templates/TemplatePicker"
import { api } from "@/lib/api"
import { TEMPLATE_PREVIEW_DATA } from "@/types/template"
import { templatePropsToUpdateRequest } from "@/types/adapters"
import { logout } from "@/lib/auth"

function TemplatePickerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // change=<invitationId> → ganti template existing invitation
  const changeInvitationId = searchParams.get("change") ?? null

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isChangeMode = !!changeInvitationId

  const handleContinue = async () => {
    if (!selectedId) return
    setError(null)
    setLoading(true)

    try {
      if (isChangeMode) {
        // FE-S02-8: Update template existing invitation — data tidak hilang
        await api.updateInvitation(changeInvitationId, {
          config: {
            templateId: selectedId,
            colors: { primary: "#B5936E", secondary: "#F5ECD7" },
          },
        })
        router.push(`/dashboard/editor/${changeInvitationId}`)
      } else {
        // Buat undangan baru seperti biasa
        const uniqueSlug = `undangan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
        const initialProps = {
          ...TEMPLATE_PREVIEW_DATA,
          meta: { ...TEMPLATE_PREVIEW_DATA.meta, templateId: selectedId, slug: uniqueSlug },
        }
        const payload = templatePropsToUpdateRequest(initialProps)
        const invitation = await api.createInvitation({
          slug: payload.slug!,
          config: payload.config,
          content: payload.content!,
        })
        router.push(`/dashboard/editor/${invitation.id}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses template"
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 h-14 flex items-center gap-2 shadow-sm">
        {/* Kiri — flex-1 */}
        <div className="flex-1">
          {isChangeMode ? (
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition-colors"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline">Kembali ke Editor</span>
            </button>
          ) : (
            <button
              onClick={() => logout()}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          )}
        </div>

        {/* Tengah — judul */}
        <h1 className="font-semibold text-stone-800 text-sm text-center shrink-0">
          {isChangeMode ? "Ubah Template" : "Pilih Template"}
        </h1>

        {/* Kanan — flex-1, rata kanan */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={handleContinue}
            disabled={!selectedId || loading}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-xl bg-amber-600 text-white text-xs sm:text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : <ArrowRight size={14} />}
            <span className="hidden sm:inline">{isChangeMode ? "Pakai Ini" : "Lanjut"}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <h2 className="text-xl font-bold text-stone-800">
            {isChangeMode ? "Pilih template baru" : "Pilih template undangan"}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {isChangeMode
              ? "Data undangan kamu (nama, tanggal, venue, dll.) tidak akan berubah."
              : "Kamu bisa ganti template sebelum undangan dipublikasikan."}
          </p>
        </motion.div>

        <TemplatePicker
          selectedId={selectedId ?? undefined}
          onSelect={setSelectedId}
          changeId={changeInvitationId ?? undefined}
        />

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-sm text-red-600"
          >
            {error}
          </motion.p>
        )}

        {/* Tombol lanjut hanya di topbar — tidak ada duplikat di sini */}
      </div>
    </main>
  )
}

export default function TemplatePickerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-amber-500" />
      </div>
    }>
      <TemplatePickerContent />
    </Suspense>
  )
}
