export type Role = "USER" | "DRIVER" | "ADMIN";

export type VehicleType =
  | "BIKE"
  | "CAR"
  | "BIG_CAR"
  | "TEMPO"
  | "SMALL_TRUCK"
  | "BIG_TRUCK";

export type BookingStatus =
  | "PENDING"
  | "ACCEPTED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export interface User {
  id: string;
  name: string | null;
  email: string;
  phoneNumber: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  role: Role;
}

export interface AuthConfig {
  googleOAuth: { enabled: boolean; url: string | null };
  otp: { debug: boolean };
}

export interface AuthResult {
  token: string;
  refreshToken?: string;
  user: User;
  role: Role;
  driverId?: string | null;
}

export interface Driver {
  id: string;
  name: string;
  phoneNumber: string;
  vehicleType: VehicleType;
  licensePlate: string;
  rating: number;
  currentLat: number | null;
  currentLng: number | null;
  status?: string;
  isAvailable?: boolean;
  totalTrips?: number;
  kycStatus?: string;
  licenseDocUrl?: string | null;
  idDocUrl?: string | null;
  kycNote?: string | null;
  bankAccNo?: string | null;
  ifscCode?: string | null;
}

export interface Booking {
  id: string;
  pickupLocation: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLocation: string;
  dropoffLat: number;
  dropoffLng: number;
  vehicleType: VehicleType;
  estimatedCost: number;
  discountAmount?: number;
  couponCode?: string | null;
  estimatedDistance: number;
  estimatedDuration: number;
  status: BookingStatus;
  paymentStatus: string;
  paymentMethod: string | null;
  driverLat: number | null;
  driverLng: number | null;
  rating: number | null;
  createdAt: string;
  scheduledTime: string | null;
  cancelReason?: string | null;
  userId: string;
  driverId: string | null;
  driver?: Driver | null;
  user?: { id: string; name: string | null; phoneNumber: string } | null;
  stops?: BookingStop[];
}

export interface BookingStop {
  id: string;
  orderIndex: number;
  location: string;
  lat: number;
  lng: number;
  stopType: "PICKUP" | "WAYPOINT" | "DROP";
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderUserId: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

export interface FareBreakdown {
  base: number;
  distanceCost: number;
  timeCost: number;
  surgeMultiplier: number;
  total: number;
}

export interface Quote {
  vehicleType: VehicleType;
  fare: FareBreakdown;
}

export interface Estimate {
  distanceKm: number;
  durationMin: number;
  surgeMultiplier: number;
  source: string;
  routeGeometry?: [number, number][];
  quotes: Quote[];
  selected?: Quote;
}

export interface PlaceResult {
  displayName: string;
  lat: number;
  lng: number;
}

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  bookingId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  BIKE: "Bike",
  CAR: "Car",
  BIG_CAR: "Big Car",
  TEMPO: "Tempo",
  SMALL_TRUCK: "Small Truck",
  BIG_TRUCK: "Big Truck",
};
