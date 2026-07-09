import type { BookingStatus, VehicleType } from "./types";

export const STATUS_META: Record<
  BookingStatus,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "info" | "destructive" }
> = {
  PENDING: { label: "Finding driver", variant: "warning" },
  ACCEPTED: { label: "Driver assigned", variant: "info" },
  ARRIVED: { label: "Driver arrived", variant: "info" },
  IN_PROGRESS: { label: "In progress", variant: "info" },
  COMPLETED: { label: "Completed", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export const VEHICLE_META: Record<
  VehicleType,
  { label: string; icon: string; blurb: string }
> = {
  BIKE: { label: "Bike", icon: "🏍️", blurb: "Small parcels & documents" },
  CAR: { label: "Car", icon: "🚗", blurb: "Boxes & small furniture" },
  BIG_CAR: { label: "Big Car", icon: "🚙", blurb: "Multiple boxes, appliances" },
  TEMPO: { label: "Tempo", icon: "🚐", blurb: "1 BHK / small office move" },
  SMALL_TRUCK: { label: "Small Truck", icon: "🚚", blurb: "2 BHK moves" },
  BIG_TRUCK: { label: "Big Truck", icon: "🛻", blurb: "3+ BHK / bulk cargo" },
};

export const currency = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;
