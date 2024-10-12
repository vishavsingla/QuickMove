import axios from 'axios';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const createBooking = async (req: Request, res: Response): Promise<Response> => {
	try {
		const { userId, pickupLocation, dropoffLocation, vehicleType } = req.body;

		// Validate input
		if (!pickupLocation || !dropoffLocation || !vehicleType) {
			return res.status(400).json({ message: "All fields are required" });
		}

		// Fetch lat/lng using Google Maps API
		const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!googleApiKey) {
            return res.status(500).json({ message: "Google API key is missing" });
        }
		const pickupLatLng = await getLatLngFromAddress(pickupLocation, googleApiKey);
		const dropoffLatLng = await getLatLngFromAddress(dropoffLocation, googleApiKey);

		// Calculate distance and cost
		const distance = calculateDistance(pickupLatLng.lat, pickupLatLng.lng, dropoffLatLng.lat, dropoffLatLng.lng);
		const estimatedCost = await calculateCostWithGoogleMaps(pickupLatLng.lat, pickupLatLng.lng, dropoffLatLng.lat, dropoffLatLng.lng, vehicleType);

		// Create booking
		const booking = await prisma.booking.create({
			data: {
				userId,
				pickupLocation,
				pickupLat: pickupLatLng.lat,
				pickupLng: pickupLatLng.lng,
				dropoffLocation,
				dropoffLat: dropoffLatLng.lat,
				dropoffLng: dropoffLatLng.lng,
				estimatedCost,
				status: 'PENDING',
			},
		});

		// Notify nearby drivers
		notifyNearbyDrivers(pickupLatLng, vehicleType);

		return res.status(200).json({ message: "Booking created successfully", booking });
	} catch (err: any) {
		return res.status(500).json({ message: "Internal server error", error: err.message });
	}
};

// Helper function to get lat/lng from an address
const getLatLngFromAddress = async (address: string, apiKey: string) => {
	const response = await axios.get(
		`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
	);

	const data = response.data;
	if (data.status === "OK") {
		const { lat, lng } = data.results[0].geometry.location;
		return { lat, lng };
	} else {
		throw new Error("Failed to fetch lat/lng");
	}
};

// Calculate distance between two coordinates (in km)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
	const R = 6371; // Radius of the Earth in km
	const dLat = (lat2 - lat1) * (Math.PI / 180);
	const dLng = (lng2 - lng1) * (Math.PI / 180);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
		Math.sin(dLng / 2) * Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c;
	return distance;
};

// Calculate cost based on distance and vehicle type
const calculateCostWithGoogleMaps = async (pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number, vehicleType: string) => {
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLat},${pickupLng}&destinations=${dropoffLat},${dropoffLng}&key=${googleApiKey}`;
  
    const response = await axios.get(url);
    const distanceData = response.data;
  
    if (distanceData.rows[0].elements[0].status === "OK") {
      const distanceInMeters = distanceData.rows[0].elements[0].distance.value; // in meters
      const travelTimeInSeconds = distanceData.rows[0].elements[0].duration.value; // in seconds
      const distanceInKm = distanceInMeters / 1000;
  
      let baseRate = 10; // base rate per km
      if (vehicleType === 'CAR') baseRate = 15;
      else if (vehicleType === 'BIKE') baseRate = 7;
      else if (vehicleType === 'TRUCK') baseRate = 25;
  
      // Cost calculation based on distance
      let estimatedCost = distanceInKm * baseRate;
  
      // Adding additional charges based on time and demand
      const expectedTimeInSeconds = distanceInKm * 60; // Assuming 1 minute per km
      if (travelTimeInSeconds > expectedTimeInSeconds) {
        const extraTimeCost = (travelTimeInSeconds - expectedTimeInSeconds) * 0.02; // Additional cost per second
        estimatedCost += extraTimeCost;
      }
  
      return estimatedCost;
    } else {
      throw new Error("Failed to fetch distance information from Google Maps");
    }
  };

const cancelBooking = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { bookingId } = req.body;
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' }
    });

    return res.status(200).json({ message: "Booking cancelled", booking });
  } catch (error: any) {
    return res.status(500).json({ message: "Error cancelling booking", error: error.message });
  }
};

const callDriver = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { bookingId } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { driver: true }
    });

    if (!booking || !booking.driver) {
      return res.status(404).json({ message: "Driver not found for this booking" });
    }

    return res.status(200).json({ driverPhoneNumber: booking.driver.phoneNumber });
  } catch (error: any) {
    return res.status(500).json({ message: "Error contacting driver", error: error.message });
  }
};

  

// Notify nearby drivers (dummy function for now)
const notifyNearbyDrivers = (pickupLatLng: { lat: number, lng: number }, vehicleType: string) => {
	// Logic to notify drivers with the given vehicleType within a certain range (e.g., 5km radius)
};
