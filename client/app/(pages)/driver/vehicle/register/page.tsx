// import React, { useState } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { toast } from "@/components/ui/use-toast";

// const VehicleRegistration = () => {
//   const [vehicleData, setVehicleData] = useState({
//     make: '',
//     model: '',
//     year: '',
//     licensePlate: '',
//     vehicleType: '',
//   });

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setVehicleData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleVehicleTypeChange = (value) => {
//     setVehicleData(prev => ({ ...prev, vehicleType: value }));
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     // Here you would typically send the data to your backend
//     console.log('Vehicle data submitted:', vehicleData);
//     toast({
//       title: "Vehicle Registration Submitted",
//       description: "Your vehicle registration has been submitted for approval.",
//     });
//     // Reset form after submission
//     setVehicleData({
//       make: '',
//       model: '',
//       year: '',
//       licensePlate: '',
//       vehicleType: '',
//     });
//   };

//   return (
//     <div className="container mx-auto py-8">
//       <Card className="max-w-md mx-auto">
//         <CardHeader>
//           <CardTitle className="text-2xl font-bold">Vehicle Registration</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div className="space-y-