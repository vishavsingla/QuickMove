"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from 'axios';

export default function Page() {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="w-full max-w-md">
                <CardWithForm />
            </div>
        </div>
    );
}

export function CardWithForm() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    useEffect(() => {
        if (password !== confirmPassword) {
            setError('Passwords do not match');
        } else {
            setError("");
        }
    }, [password, confirmPassword]);

    const handleSubmit = async (event:any) => {
        event.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
            
        try {
            console.log(name)
            const response = await axios.post('http://localhost:5000/auth/user/signup', {
                name,
                email,
                password,
                phoneNumber
            });
            console.log('Signup successful:', response.data);
            if(response.status == 200){
                router.push("/auth/login");
                setName('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
            }
        } catch (error:any) {
            console.error('Signup failed:', error.response.data);
            setError(error.response.data.message || 'An error occurred during signup');
        }
    };

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="text-center text-xl font-extrabold">
                    Signup
                </CardTitle>
            </CardHeader>
            <CardContent>
                
                <form className="grid grid-cols-1 gap-4 px-4 py-6" onSubmit={handleSubmit}>
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="name" className="sm:w-32 md:w-48 lg:w-64 xl:w-80">
                            Name
                        </Label>
                        <Input
                            id="name"
                            placeholder="Name"
                            className="sm:w-32 md:w-48 lg:w-64 xl:w-80"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="email" className="sm:w-32 md:w-48 lg:w-64 xl:w-80">
                            Email
                        </Label>
                        <Input
                            id="email"
                            placeholder="Email"
                            className="sm:w-32 md:w-48 lg:w-64 xl:w-80"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="tel" className="sm:w-32 md:w-48 lg:w-64 xl:w-80">
                            Phone Number
                        </Label>
                        <Input
                            id="phoneNumber"
                            placeholder="Phone Number"
                            className="sm:w-32 md:w-48 lg:w-64 xl:w-80"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="password" className="sm:w-32 md:w-48 lg:w-64 xl:w-80">
                            Password
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Password"
                            className="sm:w-32 md:w-48 lg:w-64 xl:w-80"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                        <Label
                            htmlFor="confirmPassword"
                            className="sm:w-32 md:w-48 lg:w-64 xl:w-80"
                        >
                            Confirm Password
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm Password"
                            className="sm:w-32 md:w-48 lg:w-64 xl:w-80"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </form>
                <div >{error && <div className="text-red-500 mb-4 px-5 text-sm">* {error}</div>}</div>
                
            </CardContent>
            <CardFooter className="flex flex-col items-center px-4">
                <Button
                    type="submit"
                    className="sm:w-32 md:w-48 lg:w-64 xl:w-80 hover:bg-slate-50"
                    onClick={handleSubmit}
                    disabled={!name || !email || !password || !confirmPassword}
                >
                    Submit
                </Button>
                <div className="mt-2 text-sm">
                    Already have an Account?{' '}
                    <Link href="/auth/login" className="text-blue-500 hover:underline">
                        Login
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}