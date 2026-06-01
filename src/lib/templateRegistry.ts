/**
 * templateRegistry — peta slug → React component + cache template list dari BE.
 *
 * BE menyimpan templateId sebagai UUID. FE memakai slug untuk menentukan
 * komponen mana yang di-render. Registry ini menghubungkan keduanya.
 *
 * Alur:
 *   UUID (dari invitation.config.templateId)
 *     → lookup via templateCache (id → Template)
 *     → ambil slug
 *     → lookup komponen via COMPONENT_MAP
 *
 * Untuk backward-compat dengan data lama yang masih pakai slug langsung
 * sebagai templateId, slug juga bisa di-resolve langsung.
 */

import type { ComponentType } from "react"
import type { TemplateProps } from "@/types/template"
import type { Template } from "@/types/api"
import { api } from "@/lib/api"

import TemplateElegantGarden from "@/components/templates/TemplateElegantGarden"
import TemplateModernSerif from "@/components/templates/TemplateModernSerif"
import TemplateRoyalBatik from "@/components/templates/TemplateRoyalBatik"
import TemplateCartoonWhimsical from "@/components/templates/TemplateCartoonWhimsical"

// ─── Komponen Map (slug → component) ─────────────────────
// Tambahkan entry baru di sini saat ada template baru.

export const COMPONENT_MAP: Record<string, ComponentType<TemplateProps>> = {
  // Slug dari BE
  "elegant-classic":    TemplateElegantGarden,   // BE: "Elegant Classic"
  "modern-minimalist":  TemplateModernSerif,      // BE: "Modern Minimalist"
  "javanese-gold":      TemplateRoyalBatik,       // BE: "Javanese Gold"
  "cartoon-whimsical":   TemplateCartoonWhimsical,  // BE: "Cartoon Whimsical"
  // Slug legacy (data lama di DB / dev yang belum migrasi)
  "elegant-garden":     TemplateElegantGarden,
  "modern-serif":       TemplateModernSerif,
  "royal-batik":        TemplateRoyalBatik,
}

export const FALLBACK_COMPONENT: ComponentType<TemplateProps> = TemplateElegantGarden

// ─── Cache template list dari BE ─────────────────────────

let templateCache: Template[] | null = null
let fetchPromise: Promise<Template[]> | null = null

export async function getTemplates(): Promise<Template[]> {
  if (templateCache) return templateCache

  if (!fetchPromise) {
    fetchPromise = api.listTemplates().then(list => {
      templateCache = list
      fetchPromise = null
      return list
    }).catch(err => {
      fetchPromise = null
      throw err
    })
  }

  return fetchPromise
}

/** Paksa invalidasi cache (berguna setelah mutasi atau hot reload dev) */
export function invalidateTemplateCache() {
  templateCache = null
  fetchPromise = null
}

// ─── Resolver: templateId (UUID atau slug) → component ───

/**
 * Resolve komponen dari templateId.
 * - Jika templateId berupa UUID: lookup via cache → ambil slug → ambil component
 * - Jika templateId berupa slug (legacy): lookup langsung di COMPONENT_MAP
 * - Fallback ke FALLBACK_COMPONENT jika tidak ketemu
 */
export async function resolveTemplateComponent(
  templateId: string
): Promise<ComponentType<TemplateProps>> {
  // Cek dulu apakah ini slug (bukan UUID)
  if (COMPONENT_MAP[templateId]) {
    return COMPONENT_MAP[templateId]
  }

  // Anggap UUID — lookup via cache
  try {
    const templates = await getTemplates()
    const tpl = templates.find(t => t.id === templateId)
    if (tpl && COMPONENT_MAP[tpl.slug]) {
      return COMPONENT_MAP[tpl.slug]
    }
  } catch {
    // Cache fetch gagal — fallback ke komponen default
  }

  return FALLBACK_COMPONENT
}

/**
 * Resolve slug dari templateId (UUID atau slug).
 * Return null jika tidak ketemu.
 */
export async function resolveTemplateSlug(templateId: string): Promise<string | null> {
  if (COMPONENT_MAP[templateId]) return templateId  // sudah berupa slug

  try {
    const templates = await getTemplates()
    const tpl = templates.find(t => t.id === templateId)
    return tpl?.slug ?? null
  } catch {
    return null
  }
}

/**
 * Resolve nama display dari templateId.
 */
export async function resolveTemplateName(templateId: string): Promise<string> {
  // Cek slug langsung
  const slugLabels: Record<string, string> = {
    "elegant-classic": "Elegant Classic",
    "modern-minimalist": "Modern Minimalist",
    "javanese-gold": "Javanese Gold",
    "cartoon-whimsical": "Cartoon Whimsical",
    "elegant-garden": "Elegant Garden",
    "modern-serif": "Modern Serif",
    "royal-batik": "Royal Batik",
  }
  if (slugLabels[templateId]) return slugLabels[templateId]

  try {
    const templates = await getTemplates()
    const tpl = templates.find(t => t.id === templateId)
    return tpl?.name ?? templateId
  } catch {
    return templateId
  }
}

/** Sync version — hanya works kalau cache sudah terisi */
export function resolveTemplateComponentSync(
  templateId: string
): ComponentType<TemplateProps> {
  if (COMPONENT_MAP[templateId]) return COMPONENT_MAP[templateId]

  if (templateCache) {
    const tpl = templateCache.find(t => t.id === templateId)
    if (tpl && COMPONENT_MAP[tpl.slug]) return COMPONENT_MAP[tpl.slug]
  }

  return FALLBACK_COMPONENT
}

export function resolveTemplateNameSync(templateId: string): string {
  const slugLabels: Record<string, string> = {
    "elegant-classic": "Elegant Classic",
    "modern-minimalist": "Modern Minimalist",
    "javanese-gold": "Javanese Gold",
    "cartoon-whimsical": "Cartoon Whimsical",
    "elegant-garden": "Elegant Garden",
    "modern-serif": "Modern Serif",
    "royal-batik": "Royal Batik",
  }
  if (slugLabels[templateId]) return slugLabels[templateId]

  if (templateCache) {
    const tpl = templateCache.find(t => t.id === templateId)
    if (tpl) return tpl.name
  }

  return templateId
}
