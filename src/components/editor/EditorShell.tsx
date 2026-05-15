"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, Save, Check, Copy, Loader2, AlertCircle, Rocket, CheckCircle2, LayoutTemplate, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TemplateProps } from "@/types/template"
import type { InvitationStatus } from "@/types/api"
import ImageUpload from "@/components/ui/ImageUpload"

interface EditorShellProps {
  /** Template component yang akan di-render */
  TemplateComponent: React.ComponentType<TemplateProps>
  /** Data undangan dari hook */
  data: TemplateProps
  /** ID undangan (untuk link ubah template) */
  invitationId: string
  /** Status save */
  saveStatus: "idle" | "saving" | "saved" | "error"
  /** Status publish */
  publishStatus: "idle" | "publishing" | "done" | "error"
  /** Status undangan saat ini */
  invitationStatus: InvitationStatus
  /** Callback update data */
  onUpdate: (updater: (prev: TemplateProps) => TemplateProps) => void
  /** Manual save */
  onSave: () => Promise<void>
  /** Publish undangan */
  onPublish: () => Promise<void>
  /** Unpublish undangan */
  onUnpublish: () => Promise<void>
}

export default function EditorShell({
  TemplateComponent,
  data,
  invitationId,
  saveStatus,
  publishStatus,
  invitationStatus,
  onUpdate,
  onSave,
  onPublish,
  onUnpublish,
}: EditorShellProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [showChangeTemplateConfirm, setShowChangeTemplateConfirm] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const isPublished = invitationStatus === "published"

  // FE-BUG-007: Validasi form sebelum save
  const handleSave = async () => {
    const errors: string[] = []
    if (!data.couple.groomFullName && !data.couple.groomName)
      errors.push("Nama pengantin pria wajib diisi")
    if (!data.couple.brideFullName && !data.couple.brideName)
      errors.push("Nama pengantin wanita wajib diisi")
    if (!data.events.reception.date)
      errors.push("Tanggal resepsi wajib diisi")
    if (!data.events.reception.venue)
      errors.push("Nama venue resepsi wajib diisi")

    if (errors.length > 0) {
      setValidationErrors(errors)
      setTimeout(() => setValidationErrors([]), 5000)
      return
    }
    setValidationErrors([])
    try {
      await onSave()
    } catch {
      // error sudah di-handle di hook (saveStatus = "error")
    }
  }

  const handlePublish = async () => {
    setShowPublishConfirm(false)
    try {
      await onPublish()
    } catch {
      // error sudah di-handle di hook
    }
  }

  const handleUnpublish = async () => {
    try {
      await onUnpublish()
    } catch {
      // error sudah di-handle di hook
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* === TOPBAR === */}
      <header className="sticky top-0 z-50 bg-white border-b border-stone-200 px-3 h-14 flex items-center justify-between gap-2 shadow-sm">
        {/* Kiri: Ubah Template + Logout */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowChangeTemplateConfirm(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium border border-stone-200 text-stone-600 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
            title="Ubah Template"
          >
            <LayoutTemplate size={14} />
            <span className="hidden sm:inline">Ubah Template</span>
          </button>
          <button
            onClick={() => { import("@/lib/auth").then(m => m.logout()) }}
            className="flex items-center gap-1 p-2 rounded-lg text-xs font-medium text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Keluar"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>

        {/* Kanan: action buttons */}
        <div className="flex items-center gap-1.5">
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 disabled:opacity-50 transition-colors"
            title="Simpan"
          >
            {saveStatus === "saving"
              ? <Loader2 size={14} className="animate-spin" />
              : <Save size={14} />}
            <span className="hidden sm:inline">Simpan</span>
          </button>
          {/* Preview toggle */}
          <button
            onClick={() => setIsPreviewMode(p => !p)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium transition-colors",
              isPreviewMode
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            )}
            title={isPreviewMode ? "Kembali Edit" : "Preview"}
          >
            {isPreviewMode ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="hidden sm:inline">{isPreviewMode ? "Kembali" : "Preview"}</span>
          </button>
          {/* Publish/Unpublish */}
          {isPublished ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden xs:flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1.5 rounded-lg whitespace-nowrap">
                <CheckCircle2 size={12} />
                <span className="hidden sm:inline">Published</span>
              </span>
              <button
                onClick={handleUnpublish}
                disabled={publishStatus === "publishing"}
                className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 disabled:opacity-50 transition-colors"
                title="Unpublish"
              >
                {publishStatus === "publishing"
                  ? <Loader2 size={14} className="animate-spin" />
                  : <CheckCircle2 size={14} className="text-green-600" />}
                <span className="hidden sm:inline">Unpublish</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPublishConfirm(true)}
              disabled={publishStatus === "publishing"}
              className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              title="Publish"
            >
              {publishStatus === "publishing"
                ? <Loader2 size={14} className="animate-spin" />
                : <Rocket size={14} />}
              <span className="hidden sm:inline">
                {publishStatus === "publishing" ? "Mempublish..." : "Publish"}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* SaveIndicator — bar tipis di bawah topbar, tidak geser layout */}
      <AnimatePresence>
        {saveStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium",
              saveStatus === "saving" && "bg-stone-50 text-stone-400",
              saveStatus === "saved" && "bg-green-50 text-green-700",
              saveStatus === "error" && "bg-red-50 text-red-600",
            )}
          >
            {saveStatus === "saving" && <><Loader2 size={11} className="animate-spin" /> Menyimpan...</>}
            {saveStatus === "saved" && <><Check size={11} /> {isPublished ? "Tersimpan \u0026 langsung live" : "Tersimpan"}</> }
            {saveStatus === "error" && <><AlertCircle size={11} /> Gagal menyimpan</> }
          </motion.div>
        )}
      </AnimatePresence>

      {/* FE-BUG-007: Validation error banner */}
      <AnimatePresence>
        {validationErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 border-b border-red-200 px-4 py-2.5"
          >
            <div className="flex items-start gap-2 text-xs text-red-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <ul className="space-y-0.5">
                {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === CONTENT === */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {isPreviewMode ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <TemplateComponent {...data} />
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <EditorForm data={data} onUpdate={onUpdate} onSave={handleSave} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FE-BUG-001: Publish confirm modal */}
      <AnimatePresence>
        {showPublishConfirm && (
          <PublishConfirmModal
            slug={data.meta.slug}
            onConfirm={handlePublish}
            onCancel={() => setShowPublishConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* FE-S02-8: Change template confirm modal */}
      <AnimatePresence>
        {showChangeTemplateConfirm && (
          <ChangeTemplateModal
            invitationId={invitationId}
            onCancel={() => setShowChangeTemplateConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Publish Confirm Modal ────────────────────────────────

function PublishConfirmModal({
  onConfirm, onCancel, slug,
}: {
  onConfirm: () => void
  onCancel: () => void
  slug: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://undangan-digital.anggriawan.my.id"
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(`${baseUrl}/u/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="fixed inset-x-4 top-1/3 z-50 bg-white rounded-2xl p-6 shadow-xl max-w-sm mx-auto"
      >
        <div className="text-2xl mb-3">🚀</div>
        <h3 className="font-semibold text-stone-800 mb-1">Publish Undangan?</h3>
        <p className="text-xs text-stone-500 mb-3">
          Undangan akan bisa diakses di:
        </p>
        <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2 mb-4">
          <p className="flex-1 text-xs font-mono text-stone-700 break-all">
            {baseUrl}/u/{slug}
          </p>
          <button
            onClick={handleCopyUrl}
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
          >
            {copied
              ? <><Check size={12} className="text-green-600" /> Tersalin</>
              : <><Copy size={12} /> Salin</>
            }
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Ya, Publish!
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─── Change Template Modal ─────────────────────────────────

function ChangeTemplateModal({
  invitationId, onCancel,
}: {
  invitationId: string
  onCancel: () => void
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="fixed inset-x-4 top-1/3 z-50 bg-white rounded-2xl p-6 shadow-xl max-w-sm mx-auto"
      >
        <div className="text-2xl mb-3">🎨</div>
        <h3 className="font-semibold text-stone-800 mb-1">Ubah Template?</h3>
        <p className="text-sm text-stone-500 mb-5">
          Tampilan undangan akan berubah sesuai template baru. Tenang — semua data (nama, tanggal, venue, dll.) tetap tersimpan.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
          >
            Batal
          </button>
          <a
            href={`/dashboard/templates?change=${invitationId}`}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Pilih Template
          </a>
        </div>
      </motion.div>
    </>
  )
}

// ─── Save Indicator ───────────────────────────────────────

function SaveIndicator({
  status,
  isPublished,
}: {
  status: EditorShellProps["saveStatus"]
  isPublished: boolean
}) {
  if (status === "idle") return null
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        status === "saving" && "text-stone-400",
        status === "saved" && "text-green-600",
        status === "error" && "text-red-500",
      )}
    >
      {status === "saving" && <><Loader2 size={12} className="animate-spin" /> Menyimpan...</>}
      {status === "saved" && (
        isPublished
          ? <><Check size={12} /> Tersimpan &amp; langsung live</>
          : <><Check size={12} /> Tersimpan</>
      )}
      {status === "error" && <><AlertCircle size={12} /> Gagal menyimpan</>}
    </motion.div>
  )
}

// ─── Editor Form ──────────────────────────────────────────

function EditorForm({
  data,
  onUpdate,
  onSave,
}: {
  data: TemplateProps
  onUpdate: EditorShellProps["onUpdate"]
  onSave: EditorShellProps["onSave"]
}) {
  const set = <K extends keyof TemplateProps>(key: K, value: TemplateProps[K]) =>
    onUpdate(prev => ({ ...prev, [key]: value }))

  // Upload foto langsung trigger save — tidak tunggu auto-save 30 detik
  const setPhoto = <K extends keyof TemplateProps["photo"]>(key: K, url: string | undefined) => {
    onUpdate(prev => ({ ...prev, photo: { ...prev.photo, [key]: url } }))
    setTimeout(() => onSave(), 300) // beri waktu state update dulu
  }

  // FE-BUG-003: Slug availability check state
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const originalSlug = useRef(data.meta.slug)

  const handleSlugChange = (raw: string) => {
    const slug = raw.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    set("meta", { ...data.meta, slug })

    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)

    // Kalau sama dengan slug asli, skip check
    if (slug === originalSlug.current || slug.length < 3) {
      setSlugStatus("idle")
      return
    }

    setSlugStatus("checking")
    slugTimerRef.current = setTimeout(async () => {
      try {
        const result = await import("@/lib/api").then(m => m.api.checkSlug(slug))
        setSlugStatus(result.available ? "available" : "taken")
      } catch {
        setSlugStatus("idle")
      }
    }, 400)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-8 pb-24">

      {/* FOTO COUPLE */}
      <Section title="📸 Foto Couple">
        <ImageUpload
          value={data.photo.couple}
          onChange={url => setPhoto("couple", url)}
          aspectClass="aspect-[4/3]"
          label="Foto utama (tampil di halaman undangan)"
        />
      </Section>

      {/* PASANGAN */}
      <Section title="👫 Nama Pengantin">
        <Field label="Nama Pengantin Pria">
          <Input
            value={data.couple.groomFullName ?? data.couple.groomName}
            onChange={v => set("couple", { ...data.couple, groomFullName: v, groomName: v.split(" ")[0] ?? v })}
            placeholder="Nama lengkap pengantin pria"
          />
        </Field>
        <Field label="Nama Orang Tua Pria (opsional)">
          <Input
            value={data.couple.groomParents ?? ""}
            onChange={v => set("couple", { ...data.couple, groomParents: v })}
            placeholder="Putra dari Bapak ... & Ibu ..."
          />
        </Field>
        <Field label="Nama Pengantin Wanita">
          <Input
            value={data.couple.brideFullName ?? data.couple.brideName}
            onChange={v => set("couple", { ...data.couple, brideFullName: v, brideName: v.split(" ")[0] ?? v })}
            placeholder="Nama lengkap pengantin wanita"
          />
        </Field>
        <Field label="Nama Orang Tua Wanita (opsional)">
          <Input
            value={data.couple.brideParents ?? ""}
            onChange={v => set("couple", { ...data.couple, brideParents: v })}
            placeholder="Putri dari Bapak ... & Ibu ..."
          />
        </Field>
      </Section>

      {/* RESEPSI */}
      <Section title="🎊 Resepsi">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal">
            <Input type="date" value={data.events.reception.date}
              onChange={v => set("events", { ...data.events, reception: { ...data.events.reception, date: v } })} />
          </Field>
          <Field label="Waktu">
            <Input type="time" value={data.events.reception.time}
              onChange={v => set("events", { ...data.events, reception: { ...data.events.reception, time: v } })} />
          </Field>
        </div>
        <Field label="Nama Venue">
          <Input value={data.events.reception.venue}
            onChange={v => set("events", { ...data.events, reception: { ...data.events.reception, venue: v } })}
            placeholder="Nama gedung / tempat" />
        </Field>
        <Field label="Alamat Lengkap">
          <Textarea value={data.events.reception.address}
            onChange={v => set("events", { ...data.events, reception: { ...data.events.reception, address: v } })}
            placeholder="Alamat lengkap" />
        </Field>
        <Field label="Google Maps Link (opsional)">
          <Input value={data.events.reception.mapsUrl ?? ""}
            onChange={v => set("events", { ...data.events, reception: { ...data.events.reception, mapsUrl: v || undefined } })}
            placeholder="https://maps.google.com/..." />
        </Field>
      </Section>

      {/* AKAD */}
      <Section title="🕌 Akad Nikah">
        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!data.events.akad}
            onChange={e => set("events", {
              ...data.events,
              akad: e.target.checked
                ? { date: data.events.reception.date, time: "08:00", venue: "", address: "" }
                : undefined
            })}
            className="rounded border-stone-300 text-amber-500 focus:ring-amber-400"
          />
          Tampilkan info akad nikah
        </label>
        {data.events.akad && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 mt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal">
                <Input type="date" value={data.events.akad.date}
                  onChange={v => set("events", { ...data.events, akad: { ...data.events.akad!, date: v } })} />
              </Field>
              <Field label="Waktu">
                <Input type="time" value={data.events.akad.time}
                  onChange={v => set("events", { ...data.events, akad: { ...data.events.akad!, time: v } })} />
              </Field>
            </div>
            <Field label="Nama Venue">
              <Input value={data.events.akad.venue}
                onChange={v => set("events", { ...data.events, akad: { ...data.events.akad!, venue: v } })}
                placeholder="Nama masjid / tempat akad" />
            </Field>
            <Field label="Alamat">
              <Textarea value={data.events.akad.address}
                onChange={v => set("events", { ...data.events, akad: { ...data.events.akad!, address: v } })}
                placeholder="Alamat lengkap" />
            </Field>
          </motion.div>
        )}
      </Section>

      {/* AMPLOP DIGITAL */}
      <Section title="💳 Amplop Digital">
        <BankAccountsEditor
          accounts={data.digitalGifts?.bankAccounts ?? []}
          onChange={accounts => set("digitalGifts", { ...data.digitalGifts, bankAccounts: accounts })}
        />
        <Field label="QRIS (opsional)">
          <ImageUpload
            value={data.digitalGifts?.qrisImageUrl}
            onChange={url => {
              set("digitalGifts", { ...data.digitalGifts, qrisImageUrl: url })
              setTimeout(() => onSave(), 300)
            }}
            aspectClass="aspect-square"
            label=""
          />
        </Field>
      </Section>

      {/* LINK UNDANGAN */}
      <Section title="🔗 Link Undangan">
        <Field label="Slug URL">
          <div className="flex items-center rounded-xl border border-stone-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
            <span className="px-3 text-stone-400 text-sm shrink-0 border-r border-stone-200 py-2.5">
              {(process.env.NEXT_PUBLIC_BASE_URL ?? "https://undangan-digital.anggriawan.my.id")}/u/
            </span>
            <input
              value={data.meta.slug}
              onChange={e => handleSlugChange(e.target.value)}
              placeholder="nama-pasangan"
              className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent"
            />
          </div>
          {/* FE-BUG-003: Slug availability indicator */}
          {slugStatus === "checking" && (
            <p className="flex items-center gap-1 text-xs text-stone-400 mt-1">
              <Loader2 size={11} className="animate-spin" /> Mengecek ketersediaan...
            </p>
          )}
          {slugStatus === "available" && (
            <p className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <Check size={11} /> <span className="font-mono">{data.meta.slug}</span> tersedia
            </p>
          )}
          {slugStatus === "taken" && (
            <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
              <AlertCircle size={11} /> Slug ini sudah dipakai, coba yang lain
            </p>
          )}
        </Field>

        <Field label="Pesan Pembuka (opsional)">
          <Textarea
            value={data.meta.greeting ?? ""}
            onChange={v => set("meta", { ...data.meta, greeting: v || undefined })}
            placeholder="Dengan memohon rahmat dan ridho Allah SWT..."
            rows={3}
          />
        </Field>

        <Field label="Batas RSVP (opsional)">
          <Input
            type="date"
            value={data.meta.rsvpDeadline ?? ""}
            onChange={v => set("meta", { ...data.meta, rsvpDeadline: v || undefined })}
          />
        </Field>
      </Section>

    </div>
  )
}

// ─── Bank Accounts sub-editor ────────────────────────────

const BANK_OPTIONS = ["BCA", "Mandiri", "BNI", "BRI", "CIMB", "GoPay", "OVO", "Dana", "Lainnya"]

function BankAccountsEditor({
  accounts,
  onChange,
}: {
  accounts: NonNullable<TemplateProps["digitalGifts"]>["bankAccounts"] & {}
  onChange: (accounts: NonNullable<TemplateProps["digitalGifts"]>["bankAccounts"]) => void
}) {
  const addAccount = () => {
    if ((accounts?.length ?? 0) >= 3) return
    onChange([...(accounts ?? []), { bankName: "BCA", accountNumber: "", accountHolder: "" }])
  }

  const updateAccount = (i: number, field: string, value: string) => {
    const updated = accounts?.map((a, idx) => idx === i ? { ...a, [field]: value } : a)
    onChange(updated)
  }

  const removeAccount = (i: number) => {
    onChange(accounts?.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-3">
      {accounts?.map((acc, i) => (
        <div key={i} className="bg-stone-50 rounded-xl p-3 space-y-2 border border-stone-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Rekening {i + 1}</span>
            <button onClick={() => removeAccount(i)} className="text-stone-400 hover:text-red-500 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <select
            value={acc.bankName}
            onChange={e => updateAccount(i, "bankName", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          >
            {BANK_OPTIONS.map(b => <option key={b}>{b}</option>)}
          </select>
          <input
            value={acc.accountNumber}
            onChange={e => updateAccount(i, "accountNumber", e.target.value)}
            placeholder="Nomor rekening"
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-mono"
          />
          <input
            value={acc.accountHolder}
            onChange={e => updateAccount(i, "accountHolder", e.target.value)}
            placeholder="Atas nama"
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
        </div>
      ))}
      {(accounts?.length ?? 0) < 3 && (
        <button
          onClick={addAccount}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-stone-300 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-700 transition-colors"
        >
          + Tambah Rekening
        </button>
      )}
    </div>
  )
}

// ─── Form primitives ──────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-stone-700 text-sm">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs text-stone-500 font-medium">{label}</label>}
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
    />
  )
}
