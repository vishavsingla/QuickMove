import type {
  AuthResult,
  Booking,
  Driver,
  Estimate,
  PlaceResult,
  AppNotification,
  SavedAddress,
  User,
  VehicleType,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const TOKEN_KEY = "quickmove_token";
const REFRESH_KEY = "quickmove_refresh";

const NO_REFRESH_PATHS = [
  "/api/auth/refresh",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];

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
  hasSession: () => !!(tokenStore.get() || tokenStore.getRefresh()),
};

let refreshInFlight: Promise<boolean> | null = null;

const shouldAttemptRefresh = (path: string) =>
  !NO_REFRESH_PATHS.some((p) => path.startsWith(p));

/** Single-flight refresh so parallel 401s don't rotate the token twice. */
export async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) {
        tokenStore.clearAll();
        return false;
      }
      const data = await res.json();
      tokenStore.set(data.token);
      if (data.refreshToken) tokenStore.setRefresh(data.refreshToken);
      return true;
    } catch {
      // Network blip — keep stored session for a later retry.
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Rehydrate user from persisted tokens (access and/or refresh). */
export async function bootstrapAuth(): Promise<{
  user: any;
  role: string;
} | null> {
  if (!tokenStore.hasSession()) return null;

  if (!tokenStore.get() && tokenStore.getRefresh()) {
    const ok = await refreshAccessToken();
    if (!ok) return null;
  }

  try {
    return await request<{ user: any; role: string }>("/api/auth/me");
  } catch {
    tokenStore.clearAll();
    return null;
  }
}

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

  if (
    res.status === 401 &&
    retry &&
    shouldAttemptRefresh(path) &&
    tokenStore.getRefresh()
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, options, false);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(data.message || "Request failed", res.status);
  }
  return data as T;
}

/** Authenticated binary download (e.g. invoice PDF). */
async function downloadBlob(
  path: string,
  retry = true
): Promise<{ blob: Blob; filename: string }> {
  const token = tokenStore.get();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (
    res.status === 401 &&
    retry &&
    shouldAttemptRefresh(path) &&
    tokenStore.getRefresh()
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return downloadBlob(path, false);
  }

  if (!res.ok) {
    const text = await res.text();
    let message = "Download failed";
    try {
      message = JSON.parse(text).message || message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status);
  }

  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || "download";
  return { blob: await res.blob(), filename };
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
  getAuthConfig: () => request<import("./types").AuthConfig>("/api/auth/config"),
  sendOtp: (channel: "phone" | "email", target: string) =>
    request<{ message: string; expiresInSec: number; debugOtp?: string }>(
      "/api/auth/otp/send",
      { method: "POST", body: JSON.stringify({ channel, target }) }
    ),
  verifyOtp: (channel: "phone" | "email", target: string, code: string) =>
    request<{ message: string; user: User }>("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ channel, target, code }),
    }),
  googleOAuthUrl: () => `${API_URL}/api/auth/oauth/google`,

  // geo
  searchPlaces: (q: string) =>
    request<{ results: PlaceResult[] }>(
      `/api/geo/search?q=${encodeURIComponent(q)}`
    ),
  reversePlace: (lat: number, lng: number) =>
    request<{ place: PlaceResult }>(
      `/api/geo/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
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
  createGuestBooking: (body: Record<string, unknown>) =>
    request<{
      booking: Booking;
      token: string;
      refreshToken: string;
      user: User;
      role: string;
      isNewUser: boolean;
    }>("/api/bookings/guest", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  trackGuestBooking: (bookingId: string, phoneNumber: string) =>
    request<{ booking: Booking }>(
      `/api/bookings/guest/track?bookingId=${encodeURIComponent(bookingId)}&phoneNumber=${encodeURIComponent(phoneNumber)}`
    ),
  myBookings: () => request<{ bookings: Booking[] }>("/api/bookings"),
  getBooking: (id: string) =>
    request<{ booking: Booking }>(`/api/bookings/${id}`),
  cancelBooking: (id: string, reason?: string) =>
    request<{ booking: Booking; refundAmount?: number }>(`/api/bookings/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
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
  downloadInvoicePdf: (id: string) =>
    downloadBlob(`/api/bookings/${id}/invoice?format=pdf`),

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
  driverEarnings: () =>
    request<{
      summary: {
        balance: number;
        totalEarnings: number;
        weekEarnings: number;
        tripCount: number;
        pendingTrips: number;
        commissionRate: number;
      };
      transactions: Array<{
        id: string;
        amount: number;
        type: string;
        description: string;
        reference: string | null;
        createdAt: string;
        booking: {
          id: string;
          pickupLocation: string;
          dropoffLocation: string;
          estimatedCost: number;
          status: string;
          createdAt: string;
        } | null;
      }>;
    }>("/api/driver/earnings"),
  driverPayouts: () =>
    request<{
      payouts: Array<{
        id: string;
        amount: number;
        type: string;
        status: string;
        reference: string | null;
        description: string;
        createdAt: string;
      }>;
    }>("/api/driver/payouts"),
  updateDriverBank: (bankAccNo: string, ifscCode: string) =>
    request<{ driver: Driver }>("/api/driver/bank", {
      method: "POST",
      body: JSON.stringify({ bankAccNo, ifscCode }),
    }),
  driverWithdraw: (amount: number) =>
    request<{
      message: string;
      payout: { amount: number; status: string; gatewayRef: string };
    }>("/api/driver/withdraw", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
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
  getDriverKyc: () =>
    request<{
      kyc: {
        kycStatus: string;
        licenseDocUrl: string | null;
        idDocUrl: string | null;
        kycSubmittedAt: string | null;
        kycNote: string | null;
      };
    }>("/api/driver/kyc"),
  submitDriverKyc: (licenseFileName: string, idFileName: string) =>
    request<{ message: string; kyc: any }>("/api/driver/kyc/submit", {
      method: "POST",
      body: JSON.stringify({ licenseFileName, idFileName }),
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
  pushStatus: () =>
    request<{ enabled: boolean; subscriptions: number }>(
      "/api/notifications/push/status"
    ),
  subscribePush: (endpoint: string, keys?: { p256dh?: string; auth?: string }) =>
    request<{ message: string }>("/api/notifications/push/subscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint, keys }),
    }),
  unsubscribePush: (endpoint: string) =>
    request<{ message: string }>("/api/notifications/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint }),
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
  getPaymentConfig: () =>
    request<{
      mode: "razorpay" | "mock";
      keyId: string | null;
      currency: string;
      methods: string[];
    }>("/api/payments/config"),
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
  createRazorpayOrder: (body: {
    bookingId?: string;
    topup?: boolean;
    amount?: number;
  }) =>
    request<{
      order: { id: string; amount: number; currency: string };
      keyId: string | null;
      mode: "razorpay" | "mock";
      intentId: string;
      amount: number;
    }>("/api/payments/razorpay/order", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  verifyRazorpayPayment: (body: {
    intentId: string;
    orderId: string;
    paymentId: string;
    signature: string;
  }) =>
    request<{ message: string }>("/api/payments/razorpay/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  mockRazorpayComplete: (intentId: string, orderId: string) =>
    request<{ orderId: string; paymentId: string; signature: string }>(
      "/api/payments/razorpay/mock-complete",
      { method: "POST", body: JSON.stringify({ intentId, orderId }) }
    ),

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
  reviewDriverKyc: (driverId: string, status: "VERIFIED" | "REJECTED", note?: string) =>
    request<{ driver: Driver }>(`/api/admin/drivers/${driverId}/kyc`, {
      method: "POST",
      body: JSON.stringify({ status, note }),
    }),
  adminDriverLocations: () =>
    request<{
      drivers: Array<{
        id: string;
        name: string;
        vehicleType: string;
        licensePlate: string;
        isAvailable: boolean;
        currentLat: number;
        currentLng: number;
      }>;
    }>("/api/admin/drivers/locations"),
  adminPricingRules: () =>
    request<{ rules: Array<Record<string, unknown>> }>("/api/admin/pricing-rules"),
  adminUpdatePricingRule: (body: Record<string, unknown>) =>
    request<{ rule: unknown }>("/api/admin/pricing-rules", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};
