/**
 * API Client — wrapper untuk semua request ke Golang API (Reza)
 * Spec: docs/openapi-undangan-digital.yaml
 * Base URL: NEXT_PUBLIC_API_URL (default: http://localhost:8080/api/v1)
 *
 * Auth di-handle otomatis via authHeaders() dari lib/auth.ts (JWT cookie).
 */

import { authHeaders } from "./auth"
import type {
  UserProfile,
  Invitation,
  InvitationSummary,
  PublicInvitation,
  CreateInvitationRequest,
  UpdateInvitationRequest,
  SlugCheckResult,
  RsvpRequest,
  Rsvp,
  RsvpListResponse,
  Template,
  ApiSuccess,
  ApiError,
} from "@/types/api"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1"

// ─── Error class ─────────────────────────────────────────

export class ApiException extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = "ApiException"
  }
}

// ─── Core fetch wrapper ──────────────────────────────────

/**
 * apiFetch — auto-attach JWT dari cookie session.
 * Pass `authenticated: false` untuk endpoint publik (tidak perlu auth).
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit & { authenticated?: boolean } = {}
): Promise<T> {
  const { authenticated = true, ...fetchOptions } = options

  const authH = authenticated ? authHeaders() : {}

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authH,
    ...(fetchOptions.headers as Record<string, string> ?? {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers })
  const json = await res.text()
  if (!json) throw new ApiException("EMPTY_RESPONSE", `Server error (HTTP ${res.status})`)

  let parsed: ApiSuccess<T> | ApiError
  try {
    parsed = JSON.parse(json) as ApiSuccess<T> | ApiError
  } catch {
    throw new ApiException("INVALID_JSON", `Server error (HTTP ${res.status})`)
  }

  if (!res.ok || !parsed.success) {
    // Normalize semua 401 ke code UNAUTHORIZED — BE bisa return berbagai code
    if (res.status === 401) {
      throw new ApiException("UNAUTHORIZED", "Sesi kamu sudah habis. Silakan masuk kembali.")
    }
    const err = (parsed as ApiError).error
    // 403 EMAIL_NOT_VERIFIED — lempar dengan code agar caller bisa detect
    if (res.status === 403 && err?.code === "EMAIL_NOT_VERIFIED") {
      throw new ApiException("EMAIL_NOT_VERIFIED", err?.message ?? "Email belum diverifikasi.")
    }
    throw new ApiException(err?.code ?? "UNKNOWN", err?.message ?? `HTTP ${res.status}`)
  }

  return (parsed as ApiSuccess<T>).data
}

// ─── API Methods ─────────────────────────────────────────

export const api = {

  // ── Templates (public, no auth) ──
  listTemplates: () =>
    apiFetch<Template[]>("/templates", { authenticated: false }),

  getTemplate: (id: string) =>
    apiFetch<Template>(`/templates/${id}`, { authenticated: false }),

  // ── Auth ──
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; user: UserProfile }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      authenticated: false,
    }),

  register: (email: string, password: string, name: string) =>
    apiFetch<{ accessToken: string; user: UserProfile }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
      authenticated: false,
    }),

  getMe: () =>
    apiFetch<UserProfile>("/auth/me"),

  // ── Invitations (authenticated) ──
  listInvitations: () =>
    apiFetch<InvitationSummary[]>("/invitations"),

  createInvitation: (payload: CreateInvitationRequest) =>
    apiFetch<Invitation>("/invitations", { method: "POST", body: JSON.stringify(payload) }),

  getInvitation: (id: string) =>
    apiFetch<Invitation>(`/invitations/${id}`),

  updateInvitation: (id: string, payload: UpdateInvitationRequest) =>
    apiFetch<Invitation>(`/invitations/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  deleteInvitation: (id: string) =>
    apiFetch<null>(`/invitations/${id}`, { method: "DELETE" }),

  // ── OTP & Password Recovery ──
  verifyEmail: (email: string, otp: string) =>
    apiFetch<{ accessToken: string }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
      authenticated: false,
    }),

  resendOtp: (email: string) =>
    apiFetch<null>("/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
      authenticated: false,
    }),

  forgotPassword: (email: string) =>
    apiFetch<null>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      authenticated: false,
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiFetch<null>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
      authenticated: false,
    }),

  // Debounce 400ms sebelum call! (slug validation)
  checkSlug: (slug: string) =>
    apiFetch<SlugCheckResult>(`/slugs/check?slug=${encodeURIComponent(slug)}`),

  // ── Public (no auth) ──
  getPublicInvitation: (slug: string) =>
    apiFetch<PublicInvitation>(`/i/${slug}`, { authenticated: false }),

  // ── RSVP ──
  submitRsvp: (invitationId: string, payload: RsvpRequest) =>
    apiFetch<Rsvp>(`/invitations/${invitationId}/rsvp`, {
      method: "POST",
      body: JSON.stringify(payload),
      authenticated: false,
    }),

  getRsvpList: (invitationId: string, params?: { status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set("status", params.status)
    if (params?.page) qs.set("page", String(params.page))
    if (params?.limit) qs.set("limit", String(params.limit))
    const query = qs.toString() ? `?${qs}` : ""
    return apiFetch<RsvpListResponse>(`/invitations/${invitationId}/rsvp${query}`)
  },

  // ── Image Upload ──
  //
  // Flow: FE → BE → MinIO (BE yang handle upload ke MinIO)
  // POST /upload/image (multipart/form-data, field: "file")
  // Response: { success: true, data: { url: "https://minio.anggriawan.my.id/..." } }
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)

    // Tidak set Content-Type — biar browser set boundary multipart sendiri
    const token = authHeaders()["Authorization"]
    const headers: Record<string, string> = {}
    if (token) headers["Authorization"] = token

    const res = await fetch(`${BASE_URL}/upload/image`, {
      method: "POST",
      headers,
      body: formData,
    })

    const text = await res.text()
    if (!text) throw new ApiException("EMPTY_RESPONSE", `Upload error (HTTP ${res.status})`)

    let parsed: ApiSuccess<{ url: string }> | ApiError
    try { parsed = JSON.parse(text) } catch {
      throw new ApiException("INVALID_JSON", `Upload error (HTTP ${res.status})`)
    }

    if (!res.ok || !parsed.success) {
      const err = (parsed as ApiError).error
      throw new ApiException(err?.code ?? "UPLOAD_FAILED", err?.message ?? `HTTP ${res.status}`)
    }

    return (parsed as ApiSuccess<{ url: string }>).data.url
  },
}
