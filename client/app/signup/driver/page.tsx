"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { VEHICLE_META } from "@/lib/ui";
import type { VehicleType } from "@/lib/types";

export default function DriverSignupPage() {
  const { setSession } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    licenseNumber: "",
    licensePlate: "",
    city: "",
    area: "",
  });
  const [vehicleType, setVehicleType] = useState<VehicleType>("CAR");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.registerDriver({ ...form, vehicleType });
      setSession(res);
      toast({
        title: "Driver account created",
        description: "Your account is pending admin approval.",
      });
      router.push("/driver");
    } catch (err) {
      toast({
        title: "Signup failed",
        description: err instanceof ApiError ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container grid min-h-[calc(100vh-4rem)] place-items-center py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Drive with QuickMove</CardTitle>
          <CardDescription>
            Register your vehicle. An admin will approve you before you can accept jobs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input required value={form.name} onChange={set("name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={set("email")} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone number</Label>
              <Input required value={form.phoneNumber} onChange={set("phoneNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" required value={form.password} onChange={set("password")} />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle type</Label>
              <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(VEHICLE_META) as VehicleType[]).map((vt) => (
                    <SelectItem key={vt} value={vt}>
                      {VEHICLE_META[vt].icon} {VEHICLE_META[vt].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>License plate</Label>
              <Input required value={form.licensePlate} onChange={set("licensePlate")} />
            </div>
            <div className="space-y-1.5">
              <Label>License number</Label>
              <Input required value={form.licenseNumber} onChange={set("licenseNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input required value={form.city} onChange={set("city")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Area / locality</Label>
              <Input required value={form.area} onChange={set("area")} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create driver account
              </Button>
            </div>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Not a driver?{" "}
            <Link href="/signup" className="underline">Sign up as a customer</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
