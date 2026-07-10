import type { GeoResult } from "./geo";

/** Offline fallback when Nominatim is unreachable or rate-limited. */
export const INDIAN_CITIES: GeoResult[] = [
  { displayName: "Chandigarh, India", lat: 30.7334, lng: 76.7797 },
  { displayName: "Manali, Himachal Pradesh, India", lat: 32.2432, lng: 77.1892 },
  { displayName: "Shimla, Himachal Pradesh, India", lat: 31.1048, lng: 77.1734 },
  { displayName: "Delhi, India", lat: 28.6139, lng: 77.209 },
  { displayName: "New Delhi, Delhi, India", lat: 28.6139, lng: 77.209 },
  { displayName: "Mumbai, Maharashtra, India", lat: 19.076, lng: 72.8777 },
  { displayName: "Bangalore, Karnataka, India", lat: 12.9716, lng: 77.5946 },
  { displayName: "Bengaluru, Karnataka, India", lat: 12.9716, lng: 77.5946 },
  { displayName: "Hyderabad, Telangana, India", lat: 17.385, lng: 78.4867 },
  { displayName: "Chennai, Tamil Nadu, India", lat: 13.0827, lng: 80.2707 },
  { displayName: "Kolkata, West Bengal, India", lat: 22.5726, lng: 88.3639 },
  { displayName: "Pune, Maharashtra, India", lat: 18.5204, lng: 73.8567 },
  { displayName: "Jaipur, Rajasthan, India", lat: 26.9124, lng: 75.7873 },
  { displayName: "Lucknow, Uttar Pradesh, India", lat: 26.8467, lng: 80.9462 },
  { displayName: "Amritsar, Punjab, India", lat: 31.634, lng: 74.8723 },
  { displayName: "Dehradun, Uttarakhand, India", lat: 30.3165, lng: 78.0322 },
  { displayName: "Gurgaon, Haryana, India", lat: 28.4595, lng: 77.0266 },
  { displayName: "Gurugram, Haryana, India", lat: 28.4595, lng: 77.0266 },
  { displayName: "Noida, Uttar Pradesh, India", lat: 28.5355, lng: 77.391 },
  { displayName: "Ahmedabad, Gujarat, India", lat: 23.0225, lng: 72.5714 },
  { displayName: "Kochi, Kerala, India", lat: 9.9312, lng: 76.2673 },
  { displayName: "Goa, India", lat: 15.2993, lng: 74.124 },
  { displayName: "Panaji, Goa, India", lat: 15.4909, lng: 73.8278 },
  { displayName: "Leh, Ladakh, India", lat: 34.1526, lng: 77.577 },
  { displayName: "Dharamshala, Himachal Pradesh, India", lat: 32.219, lng: 76.3234 },
];

export const searchLocalCities = (query: string, limit = 6): GeoResult[] => {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];

  const words = q.split(/\s+/).filter(Boolean);
  const scored = INDIAN_CITIES.map((city) => {
    const name = city.displayName.toLowerCase();
    const exact = name === q || name.startsWith(q);
    const contains = name.includes(q);
    const allWords = words.every((w) => name.includes(w));
    const score = exact ? 3 : contains ? 2 : allWords ? 1 : 0;
    return { city, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((r) => r.city);
};
