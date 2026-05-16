"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Eye, LayoutGrid, List, X, Loader2, AlertCircle } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { TEMPLATE_PREVIEW_DATA } from "@/types/template"
import { COMPONENT_MAP, FALLBACK_COMPONENT } from "@/lib/templateRegistry"
import type { Template } from "@/types/api"
import { api } from "@/lib/api"

// ─── Full-screen Preview Overlay ─────────────────────────

function PreviewOverlay({
  template,
  onClose,
}: {
  template: Template
  onClose: () => void
}) {
  const TemplateComponent = COMPONENT_MAP[template.slug] ?? FALLBACK_COMPONENT

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-white overflow-y-auto"
    >
      {/* Topbar — hanya tombol Tutup */}
      <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 h-14 bg-white/90 backdrop-blur-sm border-b border-stone-200 shadow-sm">
        <p className="text-sm font-semibold text-stone-800">{template.name}</p>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Template render */}
      <div className="pt-14">
        <TemplateComponent {...TEMPLATE_PREVIEW_DATA} />
      </div>

      {/* Badge data contoh */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <span className="px-3 py-1.5 rounded-full bg-amber-600 text-white text-xs font-medium shadow-md">
          Preview — Data Contoh
        </span>
      </div>
    </motion.div>
  )
}

// ─── Main TemplatePicker ──────────────────────────────────

interface TemplatePickerProps {
  /** UUID template yang sedang dipilih */
  selectedId?: string
  /** Dipanggil dengan UUID template yang dipilih */
  onSelect: (templateId: string) => void
  changeId?: string
}

type ViewMode = "grid" | "list"

export default function TemplatePicker({ selectedId, onSelect }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [previewId, setPreviewId] = useState<string | null>(null)

  // Fetch template list dari BE
  useEffect(() => {
    setLoadingTemplates(true)
    setFetchError(null)
    api.listTemplates()
      .then(list => {
        const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder)
        setTemplates(sorted)
      })
      .catch(() => setFetchError("Gagal memuat daftar template. Coba refresh."))
      .finally(() => setLoadingTemplates(false))
  }, [])

  const previewTemplate = templates.find(t => t.id === previewId) ?? null
  const previewIndex = templates.findIndex(t => t.id === previewId)

  const openPreview = (id: string) => setPreviewId(id)
  const closePreview = () => setPreviewId(null)
  const prevPreview = () => { if (previewIndex > 0) setPreviewId(templates[previewIndex - 1].id) }
  const nextPreview = () => { if (previewIndex < templates.length - 1) setPreviewId(templates[previewIndex + 1].id) }

  // Suppress unused-variable warnings for nav handlers — exposed for future keyboard nav
  void prevPreview; void nextPreview

  if (loadingTemplates) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-stone-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Memuat template...</span>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-stone-600">{fetchError}</p>
        <button
          onClick={() => {
            setFetchError(null)
            setLoadingTemplates(true)
            api.listTemplates()
              .then(list => setTemplates([...list].sort((a, b) => a.sortOrder - b.sortOrder)))
              .catch(() => setFetchError("Gagal memuat daftar template. Coba refresh."))
              .finally(() => setLoadingTemplates(false))
          }}
          className="text-xs text-amber-700 hover:underline"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex justify-end">
        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
              viewMode === "grid" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
            )}
          >
            <LayoutGrid size={13} /> Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
              viewMode === "list" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
            )}
          >
            <List size={13} /> List
          </button>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === "grid" && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {templates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "relative rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-200",
                selectedId === template.id
                  ? "border-amber-500 shadow-lg shadow-amber-100"
                  : "border-stone-200 hover:border-amber-300 hover:shadow-md"
              )}
              onClick={() => onSelect(template.id)}
            >
              <div className="relative aspect-[3/4] bg-stone-100">
                {template.thumbnailUrl ? (
                  <Image
                    src={template.thumbnailUrl}
                    alt={template.name}
                    fill
                    unoptimized
                    className="object-cover z-10"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                ) : null}
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-amber-50 to-stone-200 flex items-center justify-center">
                  <span className="text-4xl opacity-20">💍</span>
                </div>

                {/* Preview button */}
                {COMPONENT_MAP[template.slug] && (
                  <button
                    onClick={e => { e.stopPropagation(); openPreview(template.id) }}
                    className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-stone-200 text-stone-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors"
                    title="Preview"
                  >
                    <Eye size={14} />
                  </button>
                )}

                {/* Category badge */}
                <div className="absolute top-2 left-2 z-20 bg-white/80 text-stone-600 text-xs font-medium px-2 py-0.5 rounded-full capitalize backdrop-blur-sm">
                  {template.category}
                </div>

                {/* Selected checkmark */}
                {selectedId === template.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute bottom-2 right-2 z-20 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shadow"
                  >
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </div>

              {/* Info */}
              <div className="px-3 py-2 bg-white">
                <h3 className="font-semibold text-stone-800 text-sm leading-tight">{template.name}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {templates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                selectedId === template.id
                  ? "border-amber-500 bg-amber-50 shadow-sm"
                  : "border-stone-200 bg-white hover:border-amber-300 hover:shadow-sm"
              )}
              onClick={() => onSelect(template.id)}
            >
              {/* Thumbnail kecil */}
              <div className="relative w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-stone-100">
                {template.thumbnailUrl && (
                  <Image
                    src={template.thumbnailUrl}
                    alt={template.name}
                    fill
                    unoptimized
                    className="object-cover z-10"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                )}
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-amber-50 to-stone-200" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-stone-800 text-sm">{template.name}</h3>
                  <span className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full capitalize">
                    {template.category}
                  </span>
                </div>
              </div>

              {/* Kanan */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                {COMPONENT_MAP[template.slug] && (
                  <button
                    onClick={e => { e.stopPropagation(); openPreview(template.id) }}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors"
                    title="Preview"
                  >
                    <Eye size={14} />
                  </button>
                )}
                {selectedId === template.id && (
                  <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Full-screen preview overlay */}
      <AnimatePresence>
        {previewTemplate && (
          <PreviewOverlay
            template={previewTemplate}
            onClose={closePreview}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
