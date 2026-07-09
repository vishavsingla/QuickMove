"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Users,
  Truck,
  Package,
  IndianRupee,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { RequireRole } from "@/components/RequireRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { STATUS_META, VEHICLE_META, currency } from "@/lib/ui";
import type { Booking, Driver, BookingStatus } from "@/lib/types";

const PIE_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminInner() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const load = useCallback(async () => {
    const [s, d, b] = await Promise.all([
      api.adminStats(),
      api.adminDrivers(),
      api.adminBookings(),
    ]);
    setStats(s);
    setDrivers(d.drivers);
    setBookings(b.bookings);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    await api.setDriverStatus(id, status);
    toast({ title: `Driver ${status.toLowerCase()}` });
    load();
  };

  if (!stats)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold">Admin console</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat icon={Users} label="Customers" value={stats.totals.users} />
        <Stat icon={Truck} label="Drivers" value={stats.totals.drivers} />
        <Stat icon={Clock} label="Pending drivers" value={stats.totals.pendingDrivers} />
        <Stat icon={Package} label="Bookings" value={stats.totals.bookings} />
        <Stat icon={CheckCircle2} label="Completed" value={stats.totals.completed} />
        <Stat icon={IndianRupee} label="Revenue" value={currency(stats.totals.revenue)} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="drivers">
            Drivers {stats.totals.pendingDrivers > 0 && <Badge variant="warning" className="ml-2">{stats.totals.pendingDrivers}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Bookings by status</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.bookingsByStatus}>
                  <XAxis dataKey="status" fontSize={11} tickFormatter={(s) => STATUS_META[s as BookingStatus]?.label ?? s} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Bookings by vehicle</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.bookingsByVehicle}
                    dataKey="count"
                    nameKey="vehicleType"
                    outerRadius={90}
                    label={(e: any) => VEHICLE_META[e.vehicleType as keyof typeof VEHICLE_META]?.label ?? e.vehicleType}
                  >
                    {stats.bookingsByVehicle.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-xs text-muted-foreground">{d.phoneNumber}</div>
                      </TableCell>
                      <TableCell>
                        {VEHICLE_META[d.vehicleType].icon} {d.licensePlate}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.status === "APPROVED" ? "success" : d.status === "REJECTED" ? "destructive" : "warning"}>
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {d.status !== "APPROVED" && (
                          <Button size="sm" className="mr-2" onClick={() => setStatus(d.id, "APPROVED")}>
                            Approve
                          </Button>
                        )}
                        {d.status !== "REJECTED" && (
                          <Button size="sm" variant="outline" onClick={() => setStatus(d.id, "REJECTED")}>
                            Reject
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Fare</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="max-w-[240px] truncate text-sm">
                        {b.pickupLocation.split(",")[0]} → {b.dropoffLocation.split(",")[0]}
                      </TableCell>
                      <TableCell>{VEHICLE_META[b.vehicleType].icon}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_META[b.status].variant}>{STATUS_META[b.status].label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{currency(b.estimatedCost)}</TableCell>
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
}

export default function AdminPage() {
  return (
    <RequireRole role="ADMIN">
      <AdminInner />
    </RequireRole>
  );
}
