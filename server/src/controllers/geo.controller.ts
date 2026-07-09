import { Request, Response } from "express";
import { VehicleType } from "@prisma/client";
import { geocode, routeBetween } from "../utils/geo";
import { estimateFare, currentSurge } from "../utils/pricing";

export const searchPlaces = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "");
    const results = await geocode(q);
    return res.status(200).json({ results });
  } catch (err: any) {
    return res.status(500).json({ message: "Search failed", error: err.message });
  }
};

export const estimate = async (req: Request, res: Response) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType } = req.body;
    if (
      pickupLat == null ||
      pickupLng == null ||
      dropoffLat == null ||
      dropoffLng == null
    )
      return res
        .status(400)
        .json({ message: "pickup and dropoff coordinates are required" });

    const route = await routeBetween(
      { lat: Number(pickupLat), lng: Number(pickupLng) },
      { lat: Number(dropoffLat), lng: Number(dropoffLng) }
    );

    const surge = currentSurge();
    const distanceKm = Number(route.distanceKm.toFixed(2));
    const durationMin = Number(route.durationMin.toFixed(1));

    const quotes = Object.values(VehicleType).map((vt) => ({
      vehicleType: vt,
      fare: estimateFare(vt, distanceKm, durationMin, surge),
    }));

    const selected = vehicleType
      ? quotes.find((q) => q.vehicleType === vehicleType)
      : undefined;

    return res.status(200).json({
      distanceKm,
      durationMin,
      surgeMultiplier: surge,
      source: route.source,
      quotes,
      selected,
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Estimate failed", error: err.message });
  }
};
