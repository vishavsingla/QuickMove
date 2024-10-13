'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Truck, RotateCcw, CheckCircle, XCircle } from 'lucide-react';

const DriverDashboard = () => {
  const [isLive, setIsLive] = useState(false);
  const [currentRides, setCurrentRides] = useState([
    { id: 1, pickup: '123 Main St', dropoff: '456 Elm St', status: 'Pending' },
    { id: 2, pickup: '789 Oak Ave', dropoff: '321 Pine Rd', status: 'En Route' },
  ]);
  const [rideHistory, setRideHistory] = useState([
    { id: 3, date: '2024-10-13', pickup: '555 Maple Dr', dropoff: '777 Birch Ln', status: 'Completed' },
    { id: 4, date: '2024-10-12', pickup: '888 Cedar St', dropoff: '999 Spruce Ave', status: 'Cancelled' },
  ]);

  const handleStatusUpdate = (rideId: number, newStatus: string) => {
    setCurrentRides(currentRides.map(ride => 
      ride.id === rideId ? { ...ride, status: newStatus } : ride
    ));
  };

  const handleCancelRide = (rideId:number) => {
    setCurrentRides(currentRides.filter(ride => ride.id !== rideId));
    const rideToCancel = currentRides.find(ride => ride.id === rideId);
    if (rideToCancel) {
      setRideHistory([...rideHistory, { ...rideToCancel, status: 'Cancelled', date: new Date().toISOString().split('T')[0] }]);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Driver Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Go Live</span>
            <Switch
              checked={isLive}
              onCheckedChange={setIsLive}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {isLive ? "You're online and can accept rides." : "Go online to start accepting rides."}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Current Rides</TabsTrigger>
          <TabsTrigger value="history">Ride History</TabsTrigger>
        </TabsList>
        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Current Rides</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Dropoff</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRides.map((ride) => (
                    <TableRow key={ride.id}>
                      <TableCell>{ride.pickup}</TableCell>
                      <TableCell>{ride.dropoff}</TableCell>
                      <TableCell>{ride.status}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(ride.id, 'En Route')}>
                            <Truck className="w-4 h-4 mr-2" />En Route
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(ride.id, 'Delivered')}>
                            <CheckCircle className="w-4 h-4 mr-2" />Delivered
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleCancelRide(ride.id)}>
                            <XCircle className="w-4 h-4 mr-2" />Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Ride History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Dropoff</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rideHistory.map((ride) => (
                    <TableRow key={ride.id}>
                      <TableCell>{ride.date}</TableCell>
                      <TableCell>{ride.pickup}</TableCell>
                      <TableCell>{ride.dropoff}</TableCell>
                      <TableCell>{ride.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DriverDashboard;