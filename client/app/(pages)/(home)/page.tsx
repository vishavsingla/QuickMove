'use client';
import React from "react";
import { useRouter } from "next/navigation";
import { Truck, Package, MapPin, BarChart, UserCircle, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
    const router = useRouter();

    const features = [
        { icon: Truck, title: "On-Demand Booking", description: "Book a vehicle for transporting goods instantly" },
        { icon: Package, title: "Real-Time Tracking", description: "Track your shipment's location in real-time" },
        { icon: MapPin, title: "Flexible Delivery", description: "Choose pickup and drop-off locations" },
        { icon: BarChart, title: "Transparent Pricing", description: "Get upfront price estimates for your shipments" },
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <Truck className="mr-2" /> LogiTrack
                    </h1>
                    <div>
                        <Button onClick={() => router.push('/auth/login')} variant="outline" className="mr-2">
                            <UserCircle className="mr-2" /> User Login
                        </Button>
                        <Button onClick={() => router.push('/auth/login')} variant="outline" className="mr-2">
                            <Truck className="mr-2" /> Driver Login
                        </Button>
                        <Button onClick={() => router.push('/auth/login')} variant="outline">
                            <Briefcase className="mr-2" /> Admin Login
                        </Button>
                    </div>
                </div>
            </header>

            <main>
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
                                Efficient Goods Transportation
                            </h2>
                            <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
                                Connect with drivers, book transportation, and track your shipments in real-time with our logistics platform.
                            </p>
                        </div>

                        <div className="mt-10">
                            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                                {features.map((feature, index) => (
                                    <Card key={index}>
                                        <CardHeader>
                                            <CardTitle className="flex items-center text-lg">
                                                <feature.icon className="mr-2 h-6 w-6" />
                                                {feature.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-gray-500">{feature.description}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        <div className="mt-20 text-center ">
                            <Button size="lg" onClick={() => router.push('/auth/user/signup')} className="ml-4 hover:bg-gray-200">
                                Get Started as a User
                            </Button>
                            <Button size="lg" onClick={() => router.push('/auth/driver/signup')} className="ml-4 hover:bg-gray-200">
                                Join as a Driver
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}