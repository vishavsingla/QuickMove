'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle, UserCheck, Truck } from 'lucide-react';
import axios from 'axios';

interface Driver {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  licenseNumber: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  licensePlate: string;
  city: string;
  area: string;
  status: string;
  id: string;
}
const AdminDashboard = () => {
  
  
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get('http://localhost:5000/admin/drivers', { withCredentials: true });
      setDrivers(response.data);  
    };
    fetchData();
  }, []);

  const [vehicles, setVehicles] = useState([
    { id: 1, type: 'Car', licensePlate: 'ABC123', status: 'Pending' },
    { id: 2, type: 'Truck', licensePlate: 'XYZ789', status: 'Approved' },
  ]);

  const analyticsData = [
    { area: 'North', bookings: 120 },
    { area: 'South', bookings: 80 },
    { area: 'East', bookings: 100 },
    { area: 'West', bookings: 90 },
  ];

  const handleDriverApproval = async(driverId: string, newStatus: string) => {
    const response = await axios.post('http://localhost:5000/admin/drivers/approve', {
      driverId,
      newStatus,
    }, { withCredentials: true });
    setDrivers(drivers.map(driver => 
      driver.id === driverId ? { ...driver, status: newStatus } : driver
    ));
  };

  const handleVehicleApproval = (vehicleId: number, newStatus: string) => {
      setVehicles(vehicles.map(vehicle => 
        vehicle.id === vehicleId ? { ...vehicle, status: newStatus } : vehicle
      ));
    };

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Admin Dashboard</CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="drivers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="drivers">Driver Management</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicle Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="drivers">
          <Card>
            <CardHeader>
              <CardTitle>Driver Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>License Number</TableHead>
                    <TableHead>Vehicle Number</TableHead>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell>{driver.name}</TableCell>
                      <TableCell>{driver.status}</TableCell>
                      <TableCell>{driver.vehicleType}</TableCell>
                      <TableCell>{driver.licenseNumber}</TableCell>
                      <TableCell>{driver.licensePlate}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleDriverApproval(driver.id, 'APPROVED')}>
                            <CheckCircle className="w-4 h-4 mr-2" />Approve
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDriverApproval(driver.id, 'REJECTED')}>
                            <XCircle className="w-4 h-4 mr-2" />Reject
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
        
        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>{vehicle.type}</TableCell>
                      <TableCell>{vehicle.licensePlate}</TableCell>
                      <TableCell>{vehicle.status}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleVehicleApproval(vehicle.id, 'Approved')}>
                            <CheckCircle className="w-4 h-4 mr-2" />Approve
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleVehicleApproval(vehicle.id, 'Rejected')}>
                            <XCircle className="w-4 h-4 mr-2" />Reject
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
        
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Area-wise Booking Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="area" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="bookings" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;