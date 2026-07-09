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
  role: Role;
}

export interface AuthResult {
  token: string;
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
  estimatedDistance: number;
  estimatedDuration: number;
  status: BookingStatus;
  paymentStatus: string;
  driverLat: number | null;
  driverLng: number | null;
  rating: number | null;
  createdAt: string;
  scheduledTime: string | null;
  userId: string;
  driverId: string | null;
  driver?: Driver | null;
  user?: { id: string; name: string | null; phoneNumber: string } | null;
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

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  BIKE: "Bike",
  CAR: "Car",
  BIG_CAR: "Big Car",
  TEMPO: "Tempo",
  SMALL_TRUCK: "Small Truck",
  BIG_TRUCK: "Big Truck",
};
