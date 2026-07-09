import type {
  AuthResult,
  Booking,
  Driver,
  Estimate,
  PlaceResult,
  AppNotification,
  SavedAddress,
  VehicleType,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const TOKEN_KEY = "quickmove_token";
const REFRESH_KEY = "quickmove_refresh";

export const tokenStore = {
  get: () =>
    typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  getRefresh: () =>
    typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY),
  setRefresh: (t: string) => localStorage.setItem(REFRESH_KEY, t),
  clearRefresh: () => localStorage.removeItem(REFRESH_KEY),
  clearAll: () => {
    tokenStore.clear();
    tokenStore.clearRefresh();
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && retry && tokenStore.getRefresh()) {
    const refreshed = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokenStore.getRefresh() }),
    });
    if (refreshed.ok) {
      const data = await refreshed.json();
      tokenStore.set(data.token);
      if (data.refreshToken) tokenStore.setRefresh(data.refreshToken);
      return request<T>(path, options, false);
    }
    tokenStore.clearAll();
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(data.message || "Request failed", res.status);
  }
  return data as T;
}

export const api = {
  // auth
  loginUser: (email: string, password: string) =>
    request<AuthResult>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  registerUser: (body: {
    name: string;
    email: string;
    phoneNumber: string;
    password: string;
  }) =>
    request<AuthResult>("/api/auth/register/user", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  registerDriver: (body: Record<string, unknown>) =>
    request<AuthResult>("/api/auth/register/driver", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<{ user: any; role: string }>("/api/auth/me"),
  refresh: (refreshToken: string) =>
    request<{ token: string; refreshToken: string }>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
  logout: (refreshToken?: string) =>
    request<{ message: string }>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  // geo
  searchPlaces: (q: string) =>
    request<{ results: PlaceResult[] }>(
      `/api/geo/search?q=${encodeURIComponent(q)}`
    ),
  estimate: (body: {
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    vehicleType?: VehicleType;
    stops?: Array<{ lat: number; lng: number }>;
  }) =>
    request<Estimate>("/api/geo/estimate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // bookings (user)
  createBooking: (body: Record<string, unknown>) =>
    request<{ booking: Booking }>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  myBookings: () => request<{ bookings: Booking[] }>("/api/bookings"),
  getBooking: (id: string) =>
    request<{ booking: Booking }>(`/api/bookings/${id}`),
  cancelBooking: (id: string) =>
    request<{ booking: Booking }>(`/api/bookings/${id}/cancel`, {
      method: "POST",
    }),
  rateBooking: (id: string, rating: number) =>
    request<{ booking: Booking }>(`/api/bookings/${id}/rate`, {
      method: "POST",
      body: JSON.stringify({ rating }),
    }),
  getChatMessages: (id: string) =>
    request<{ messages: import("./types").ChatMessage[] }>(`/api/bookings/${id}/chat`),
  getInvoice: (id: string) =>
    request<{ invoice: any; html: string }>(`/api/bookings/${id}/invoice`),

  // driver
  driverProfile: () => request<{ driver: Driver }>("/api/driver/profile"),
  setAvailability: (isAvailable: boolean) =>
    request<{ driver: Driver }>("/api/driver/availability", {
      method: "POST",
      body: JSON.stringify({ isAvailable }),
    }),
  driverLocation: (lat: number, lng: number) =>
    request<{ driver: Driver }>("/api/driver/location", {
      method: "POST",
      body: JSON.stringify({ lat, lng }),
    }),
  driverOffers: () => request<{ offers: Booking[] }>("/api/driver/offers"),
  driverJobs: () => request<{ jobs: Booking[] }>("/api/driver/jobs"),
  acceptJob: (id: string) =>
    request<{ booking: Booking }>(`/api/driver/bookings/${id}/accept`, {
      method: "POST",
    }),
  rejectJob: (id: string) =>
    request<{ message: string }>(`/api/driver/bookings/${id}/reject`, {
      method: "POST",
    }),
  updateJobStatus: (id: string, status: string) =>
    request<{ booking: Booking }>(`/api/driver/bookings/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  // admin
  adminDrivers: () => request<{ drivers: Driver[] }>("/api/admin/drivers"),
  setDriverStatus: (id: string, status: string) =>
    request<{ driver: Driver }>(`/api/admin/drivers/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  adminBookings: () => request<{ bookings: Booking[] }>("/api/admin/bookings"),
  adminUsers: () => request<{ users: any[] }>("/api/admin/users"),
  adminStats: () =>
    request<{
      totals: Record<string, number>;
      bookingsByStatus: { status: string; count: number }[];
      bookingsByVehicle: { vehicleType: string; count: number }[];
    }>("/api/admin/stats"),

  // notifications
  notifications: () =>
    request<{ notifications: AppNotification[]; unread: number }>(
      "/api/notifications"
    ),
  markRead: (id: string) =>
    request<{ message: string }>(`/api/notifications/${id}/read`, {
      method: "POST",
    }),

  // user profile & addresses
  getProfile: () => request<{ user: any }>("/api/user/profile"),
  updateProfile: (body: { name?: string; phoneNumber?: string }) =>
    request<{ user: any }>("/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  listAddresses: () =>
    request<{ addresses: SavedAddress[] }>("/api/user/addresses"),
  createAddress: (body: {
    label: string;
    address: string;
    lat: number;
    lng: number;
    isDefault?: boolean;
  }) =>
    request<{ address: SavedAddress }>("/api/user/addresses", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteAddress: (id: string) =>
    request<{ message: string }>(`/api/user/addresses/${id}`, {
      method: "DELETE",
    }),

  // payments & wallet
  getWallet: () =>
    request<{
      wallet: { balance: number; currency: string };
      transactions: Array<{
        id: string;
        amount: number;
        type: string;
        description: string;
        createdAt: string;
      }>;
    }>("/api/payments/wallet"),
  topUpWallet: (amount: number) =>
    request<{ wallet: { balance: number } }>("/api/payments/wallet/topup", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  createPaymentIntent: (bookingId: string) =>
    request<{ intent: { id: string; amount: number; status: string } }>(
      "/api/payments/intents",
      { method: "POST", body: JSON.stringify({ bookingId }) }
    ),
  confirmPayment: (
    intentId: string,
    method: "wallet" | "test_card",
    token?: string
  ) =>
    request<{ message: string }>(`/api/payments/intents/${intentId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ method, token }),
    }),

  validateCoupon: (code: string, orderAmount: number) =>
    request<{
      valid: boolean;
      code?: string;
      description?: string;
      discount?: number;
      finalAmount?: number;
      message?: string;
    }>("/api/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code, orderAmount }),
    }),

  adminCoupons: () =>
    request<{ coupons: any[] }>("/api/admin/coupons"),
  adminCreateCoupon: (body: Record<string, unknown>) =>
    request<{ coupon: any }>("/api/admin/coupons", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  adminToggleCoupon: (id: string) =>
    request<{ coupon: any }>(`/api/admin/coupons/${id}/toggle`, {
      method: "POST",
    }),
};
