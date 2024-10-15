'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import axios from 'axios';

const DriverSignupForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    licenseNumber: '',
    vehicleType: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    licensePlate: '',
    city: '',
    area: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e:any) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

interface FormData {
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
}

interface SelectChangeHandler {
    (value: string, field: keyof FormData): void;
}

const handleSelectChange: SelectChangeHandler = (value, field) => {
    setFormData({ ...formData, [field]: value });
};

  const handleSubmit = async (e:any) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      console.log('Driver Signup data:', formData);
      const response = await axios.post('http://localhost:5000/auth/driver/register', formData);
      console.log('Signup successful:', response);
      if(response.status == 201){
          router.push("/auth/login");
          setFormData({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            phoneNumber: '',
            licenseNumber: '',
            vehicleType: '',
            vehicleMake: '',
            vehicleModel: '',
            vehicleYear: '',
            licensePlate: '',
            city: '',
            area: '',
          });
          
      }
  } catch (error:any) {
      console.error('Signup failed:', error.response.data);
      setError(error.response.data.message || 'An error occurred during signup');
  }
    
  };


  

  return (
    <div className="m-10">
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Driver Signup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                placeholder="Enter your license number"
                value={formData.licenseNumber}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleType">Vehicle Type</Label>
              <Select onValueChange={(value) => handleSelectChange(value, 'vehicleType')} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BIKE">Bike</SelectItem>
                  <SelectItem value="CAR">Car</SelectItem>
                  <SelectItem value="BIG_CAR">Big Car</SelectItem>
                  <SelectItem value="TEMPO">Tempo</SelectItem>
                  <SelectItem value="SMALL_TRUCK">Small Truck</SelectItem>
                  <SelectItem value="BIG_TRUCK">Big Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleMake">Vehicle Make</Label>
              <Input
                id="vehicleMake"
                placeholder="Enter vehicle make"
                value={formData.vehicleMake}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleModel">Vehicle Model</Label>
              <Input
                id="vehicleModel"
                placeholder="Enter vehicle model"
                value={formData.vehicleModel}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleYear">Vehicle Year</Label>
              <Input
                id="vehicleYear"
                type="number"
                placeholder="Enter vehicle year"
                value={formData.vehicleYear}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licensePlate">License Plate</Label>
              <Input
                id="licensePlate"
                placeholder="Enter license plate"
                value={formData.licensePlate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Enter your city"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                placeholder="Enter your area"
                value={formData.area}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full">
            Sign Up as Driver
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/driver/login" className="text-blue-500 hover:underline">
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
    </div>
  );
};

export default DriverSignupForm;