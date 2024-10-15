'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPin, Truck, RotateCcw, CheckCircle, XCircle, Phone, DollarSign, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getCookie, getCookies, setCookie } from "cookies-next";
import axios from 'axios';

const DriverDashboard = () => {
  const [isLive, setIsLive] = useState(false);
  const [currentRide, setCurrentRide] = useState<{
    id: number;
    customerName: string;
    customerPhone: string;
    pickup: string;
    dropoff: string;
    status: string;
    estimatedEarnings: string;
    distance: string;
    estimatedTime: string;
  } | null>(null);

  const [rideHistory, setRideHistory] = useState<Array<{
    id: number;
    customerName: string;
    customerPhone: string;
    pickup: string;
    dropoff: string;
    status: string;
    estimatedEarnings: string;
    distance: string;
    estimatedTime: string;
  } | null>>([]);

  const [newRideNotification, setNewRideNotification] = useState<{
    id: number;
    customerName: string;
    customerPhone: string;
    pickup: string;
    dropoff: string;
    status: string;
    estimatedEarnings: string;
    distance: string;
    estimatedTime: string;
  } | null>(null);

  const router = useRouter();

  const [loading, setLoading] = useState(true);


  useEffect(() => {

    // const checkPermissions = async () => {
      // const accessToken = getCookie('sessionToken');
      // console.log("ac",accessToken);
      // if (!accessToken) {
      //   router.push('/auth/login');
      //   return;
      // }

    //   const sessionToken = getCookie('sessionToken');
    //   console.log("st",sessionToken);
    //   if (!sessionToken) {
    //     router.push('/auth/login');
    //     return;
    //   }
      
    //   try {
    //     const res = await axios.get(`http://localhost:5000/auth/user/check-session/${sessionToken}`,{withCredentials:true});
    //     const role = res.data.role;

    //     if (role !== "DRIVER") {
    //       router.push("/auth/login");
    //     } else {
    //       setLoading(false);
    //     }
    //   } catch (error) {
    //     console.error('Error checking session:', error);
    //     router.push('/auth/login');
    //   }
    // };

    // checkPermissions();

    const interval = setInterval(() => {
      if (isLive && !currentRide) {
        const newRide = generateNewRide();
        setNewRideNotification(newRide);
      }
    }, 10000);

    return () => clearInterval(interval);

  }, [isLive, currentRide]);

  // if (loading) {
  //   return <div>Loading...</div>;
  // }

  const generateNewRide = () => ({
    id: Date.now(),
    customerName: "John Doe",
    customerPhone: "+1234567890",
    pickup: "123 Main St",
    dropoff: "456 Elm St",
    status: "Pending",
    estimatedEarnings: "$25.00",
    distance: "5.2 miles",
    estimatedTime: "15 minutes"
  });

  const handleStatusUpdate = (newStatus: string) => {
    setCurrentRide(prev => (prev && typeof prev === 'object') ? { ...prev, status: newStatus } : prev);
  };

  const handleAcceptRide = () => {
    setCurrentRide(newRideNotification);
    setNewRideNotification(null);
  };

  const handleCompleteRide = () => {
    setRideHistory(prev => [currentRide, ...prev]);
    setCurrentRide(null);
  };

  const handleCancelRide = () => {
    setRideHistory(prev => [currentRide ? { ...currentRide, status: 'Cancelled' } : null, ...prev]);
    setCurrentRide(null);
  };

  return (
    <div className="container mx-auto py-8">
      <nav className="bg-gray-800 text-white p-4 mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">LogiRide Driver</h1>
          <div className="flex items-center space-x-4">
            <span>{isLive ? 'Online' : 'Offline'}</span>
            <Switch
              checked={isLive}
              onCheckedChange={setIsLive}
            />
          </div>
        </div>
      </nav>

      {newRideNotification && (
        <Alert className="mb-4">
          <AlertTitle>New Ride Request!</AlertTitle>
          <AlertDescription>
            Pickup: {newRideNotification.pickup}
            <br />
            Dropoff: {newRideNotification.dropoff}
            <br />
            Estimated Earnings: {newRideNotification.estimatedEarnings}
            <br />
            <Button onClick={handleAcceptRide} className="mt-2">Accept Ride</Button>
            {/* Reject */}

          </AlertDescription>
        </Alert>
      )}

      {currentRide ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Current Ride</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>Customer:</strong> {currentRide.customerName}</p>
                <p><strong>Phone:</strong> {currentRide.customerPhone}</p>
                <p><strong>Pickup:</strong> {currentRide.pickup}</p>
                <p><strong>Dropoff:</strong> {currentRide.dropoff}</p>
              </div>
              <div>
                <p><strong>Status:</strong> {currentRide.status}</p>
                <p><strong>Estimated Earnings:</strong> {currentRide.estimatedEarnings}</p>
                <p><strong>Distance:</strong> {currentRide.distance}</p>
                <p><strong>Estimated Time:</strong> {currentRide.estimatedTime}</p>
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <Button variant="outline" onClick={() => handleStatusUpdate('En Route')}>
                <Truck className="w-4 h-4 mr-2" />En Route
              </Button>
              <Button variant="outline" onClick={() => handleStatusUpdate('Picked Up')}>
                <MapPin className="w-4 h-4 mr-2" />Picked Up
              </Button>
              <Button variant="outline" onClick={handleCompleteRide}>
                <CheckCircle className="w-4 h-4 mr-2" />Complete
              </Button>
              <Button variant="outline" onClick={handleCancelRide}>
                <XCircle className="w-4 h-4 mr-2" />Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">No Active Ride</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You're not currently on a ride. New ride requests will appear here.</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="history">Ride History</TabsTrigger>
        </TabsList>
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
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rideHistory.map((ride) => ride && (
                    <TableRow key={ride.id}>
                      <TableCell>{new Date(ride.id).toLocaleDateString()}</TableCell>
                      <TableCell>{ride.pickup}</TableCell>
                      <TableCell>{ride.dropoff}</TableCell>
                      <TableCell>{ride.status}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">View Details</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Ride Details</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Phone className="h-4 w-4" />
                                <span className="col-span-3">{ride.customerPhone}</span>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <MapPin className="h-4 w-4" />
                                <span className="col-span-3">{ride.pickup}</span>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Truck className="h-4 w-4" />
                                <span className="col-span-3">{ride.dropoff}</span>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <DollarSign className="h-4 w-4" />
                                <span className="col-span-3">{ride.estimatedEarnings}</span>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <RotateCcw className="h-4 w-4" />
                                <span className="col-span-3">{ride.distance}</span>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Clock className="h-4 w-4" />
                                <span className="col-span-3">{ride.estimatedTime}</span>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
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