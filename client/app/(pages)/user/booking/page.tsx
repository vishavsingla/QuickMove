'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, PhoneCall, CreditCard, Truck, User, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';

const AdvancedBookingPage = () => {
  const [bookingStep, setBookingStep] = useState('booking');
  const { theme, setTheme } = useTheme();
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<{ id: number; type: string; name: string; capacity: string; price: number } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const vehicles = [
    { id: 1, type: 'BIKE', name: 'Motorcycle', capacity: '1 small package', price: 50 },
    { id: 2, type: 'CAR', name: 'Sedan', capacity: '4 medium boxes', price: 100 },
    { id: 3, type: 'TEMPO', name: 'Mini Truck', capacity: '10 large boxes', price: 200 },
    { id: 4, type: 'SMALL_TRUCK', name: 'Small Truck', capacity: '20 large boxes', price: 300 },
  ];

  const handleBooking = (e:any) => {
    e.preventDefault();
    if (selectedVehicle) {
      setBookingStep('findingDriver');
      setTimeout(() => setBookingStep('driverFound'), 3000);
    }
  };

  const renderBookingForm = () => (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Book a Ride</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleBooking} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pickup">Pickup Location</Label>
            <div className="flex">
              <Input 
                id="pickup" 
                placeholder="Enter pickup location" 
                value={pickup} 
                onChange={(e) => setPickup(e.target.value)} 
                className="flex-grow"
              />
              <Button type="button" className="ml-2">
                <MapPin className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dropoff">Dropoff Location</Label>
            <Input 
              id="dropoff" 
              placeholder="Enter dropoff location" 
              value={dropoff} 
              onChange={(e) => setDropoff(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Select a Vehicle</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vehicles.map(vehicle => (
                <Card 
                  key={vehicle.id} 
                  className={`cursor-pointer ${selectedVehicle?.id === vehicle.id ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedVehicle(vehicle)}
                >
                  <CardContent className="flex items-center p-4">
                    <Truck className="w-8 h-8 mr-4" />
                    <div>
                      <h3 className="font-bold">{vehicle.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{vehicle.capacity}</p>
                      <p className="text-sm font-bold">₹{vehicle.price}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={!selectedVehicle}>Book Ride</Button>
        </form>
      </CardContent>
    </Card>
  );

  const renderFindingDriver = () => (
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent className="flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <h2 className="text-xl font-bold mb-2">Finding your driver</h2>
        <p>Please wait while we connect you with a nearby driver...</p>
      </CardContent>
    </Card>
  );

  const renderDriverFound = () => (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Your Ride is on the Way!</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-4">
          <User className="w-12 h-12 mr-4" />
          <div>
            <h3 className="font-bold">John Doe</h3>
            {selectedVehicle && <p className="text-sm text-gray-600 dark:text-gray-400">Vehicle: {selectedVehicle.name}</p>}
            <p className="text-sm text-gray-600 dark:text-gray-400">License Plate: MH 01 AB 1234</p>
          </div>
        </div>
        <div className="bg-gray-200 dark:bg-gray-800 p-4 rounded-lg mb-4">
          <p className="text-center">Estimated arrival time: 10 minutes</p>
        </div>
        <div className="flex justify-between mb-4">
          <Button variant="outline">
            <PhoneCall className="w-4 h-4 mr-2" />
            Call Driver
          </Button>
          <Button variant="outline" className="text-red-600">
            Cancel Ride
          </Button>
        </div>
        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
          <h4 className="font-bold mb-2">Trip Details</h4>
          <p>From: {pickup}</p>
          <p>To: {dropoff}</p>
          {selectedVehicle && <p className="font-bold mt-2">Total: ₹{selectedVehicle.price}</p>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <nav className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">RideShare App</h1>
        <div className="hidden md:flex items-center space-x-4">
          <Button onClick={() => setBookingStep('booking')}>Book a Vehicle</Button>
          <Button onClick={() => {}}>My Rides</Button>
          <Button onClick={toggleTheme}>Toggle Theme</Button>
        </div>
        <Button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <Menu className="w-6 h-6" />
        </Button>
      </nav>
      
      {isMenuOpen && (
        <div className="md:hidden mb-4">
          <Button className="w-full mb-2" onClick={() => { setBookingStep('booking'); setIsMenuOpen(false); }}>Book a Ride</Button>
          <Button className="w-full mb-2" onClick={() => setIsMenuOpen(false)}>My Rides</Button>
          <Button className="w-full" onClick={() => { toggleTheme(); setIsMenuOpen(false); }}>Toggle Theme</Button>
        </div>
      )}

      {bookingStep === 'booking' && renderBookingForm()}
      {bookingStep === 'findingDriver' && renderFindingDriver()}
      {bookingStep === 'driverFound' && renderDriverFound()}
    </div>
  );
};

export default AdvancedBookingPage;