"use client";
import React, { useState } from "react";
import { getCookie, setCookie } from "cookies-next";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from 'react-redux';
import { setSessionToken } from '../../../../redux/sessionTokenSlice';

import axios from "axios";

// import { cookieStore } from "../../../cookie";

export default function CardWithForm() {
    const dispatch = useDispatch();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e:any) => {
        e.preventDefault();
        
        try {
            const response = await axios.post("http://localhost:5000/auth/user/login", {
                email,
                password,
            }, {
                withCredentials: true,
            });
            console.log(response)
            if(response.status!==200){
                setError(response.data.message)
            }
            
            else{
                router.push("/");
                setEmail('');
                setError('');
                setPassword("");
            }
        } catch (error:any) {
            if (error.response) {
                setError(error.response.data.message || "An error occurred during login");
            } else if (error.request) {
                setError("No response received from the server");
            } else {
                setError(error);
            }
        }
    };

    return (
        <Card className="w-[400px]">
            <CardHeader>
                <CardTitle className="text-center text-xl font-extrabold">Login</CardTitle>
                <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
                
                <form onSubmit={handleSubmit} className="px-4">
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                </form>

                
            </CardContent>
                <div>
                    {error && <div className="text-red-500 mb-4 px-10 text-sm">* {error}</div>}
                </div>
            <CardFooter className="flex flex-col items-center mt-2 px-10">
                <Button
                    type="submit"
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={!email || !password}
                >
                    Login
                </Button>
                <div className="mt-2">
                    Don't have an account?{" "}
                    <Link href="/auth/user/signup" className="text-blue-500 hover:underline">
                        Sign up
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}