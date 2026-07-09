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
import { LiveMap, MapMarker } from "@/components/LiveMap";
import { useSocket } from "@/context/SocketProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function PricingRuleRow({
  rule,
  onSave,
}: {
  rule: any;
  onSave: (r: any) => void;
}) {
  const [draft, setDraft] = useState(rule);
  return (
    <TableRow>
      <TableCell>{VEHICLE_META[rule.vehicleType as keyof typeof VEHICLE_META]?.label ?? rule.vehicleType}</TableCell>
      {(["base", "perKm", "perMin", "minFare", "peakSurge"] as const).map((k) => (
        <TableCell key={k}>
          <Input
            type="number"
            className="h-8 w-20"
            value={draft[k]}
            onChange={(e) => setDraft((p: any) => ({ ...p, [k]: Number(e.target.value) }))}
          />
        </TableCell>
      ))}
      <TableCell>
        <Button size="sm" variant="outline" onClick={() => onSave({ vehicleType: rule.vehicleType, ...draft })}>
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}

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
  const [coupons, setCoupons] = useState<any[]>([]);
  const [liveDrivers, setLiveDrivers] = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const { socket } = useSocket();
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "FLAT",
    discountValue: "50",
    minOrderAmount: "100",
  });

  const load = useCallback(async () => {
    const [s, d, b, c] = await Promise.all([
      api.adminStats(),
      api.adminDrivers(),
      api.adminBookings(),
      api.adminCoupons().catch(() => ({ coupons: [] })),
    ]);
    setStats(s);
    setDrivers(d.drivers);
    setBookings(b.bookings);
    setCoupons(c.coupons);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const poll = () =>
      api.adminDriverLocations().then((r) => setLiveDrivers(r.drivers)).catch(() => undefined);
    poll();
    const t = setInterval(poll, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onLoc = (d: {
      driverId: string;
      lat: number;
      lng: number;
      name: string;
      vehicleType: string;
      licensePlate: string;
      isAvailable: boolean;
    }) => {
      setLiveDrivers((prev) => {
        const rest = prev.filter((x) => x.id !== d.driverId);
        return [
          ...rest,
          {
            id: d.driverId,
            name: d.name,
            vehicleType: d.vehicleType,
            licensePlate: d.licensePlate,
            isAvailable: d.isAvailable,
            currentLat: d.lat,
            currentLng: d.lng,
          },
        ];
      });
    };
    socket.on("admin:driverLocation", onLoc);
    return () => {
      socket.off("admin:driverLocation", onLoc);
    };
  }, [socket]);

  useEffect(() => {
    api.adminPricingRules().then((r) => setPricingRules(r.rules)).catch(() => undefined);
  }, [stats]);

  const setStatus = async (id: string, status: string) => {
    await api.setDriverStatus(id, status);
    toast({ title: `Driver ${status.toLowerCase()}` });
    load();
  };

  const createCoupon = async () => {
    try {
      await api.adminCreateCoupon({
        code: newCoupon.code,
        discountType: newCoupon.discountType,
        discountValue: Number(newCoupon.discountValue),
        minOrderAmount: Number(newCoupon.minOrderAmount),
      });
      toast({ title: "Coupon created" });
      setNewCoupon({ code: "", discountType: "FLAT", discountValue: "50", minOrderAmount: "100" });
      load();
    } catch {
      toast({ title: "Could not create coupon", variant: "destructive" });
    }
  };

  const toggleCoupon = async (id: string) => {
    await api.adminToggleCoupon(id);
    load();
  };

  const reviewKyc = async (id: string, status: "VERIFIED" | "REJECTED") => {
    try {
      await api.reviewDriverKyc(id, status, status === "REJECTED" ? "Documents unclear" : undefined);
      toast({ title: `KYC ${status.toLowerCase()}` });
      load();
    } catch {
      toast({ title: "KYC review failed", variant: "destructive" });
    }
  };

  const savePricing = async (rule: any) => {
    try {
      await api.adminUpdatePricingRule(rule);
      toast({ title: "Pricing updated" });
      const r = await api.adminPricingRules();
      setPricingRules(r.rules);
    } catch {
      toast({ title: "Could not update pricing", variant: "destructive" });
    }
  };

  const liveMarkers: MapMarker[] = liveDrivers.map((d) => ({
    lat: d.currentLat,
    lng: d.currentLng,
    kind: "driver" as const,
    label: `${d.name} (${d.isAvailable ? "online" : "offline"})`,
  }));

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
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="live">Live map</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
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
                    <TableHead>KYC</TableHead>
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
                      <TableCell>
                        <Badge
                          variant={
                            d.kycStatus === "VERIFIED"
                              ? "success"
                              : d.kycStatus === "SUBMITTED"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {d.kycStatus ?? "NOT_SUBMITTED"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {d.kycStatus === "SUBMITTED" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => reviewKyc(d.id, "VERIFIED")}>
                              Verify KYC
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => reviewKyc(d.id, "REJECTED")}>
                              Reject KYC
                            </Button>
                          </>
                        )}
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

        <TabsContent value="coupons" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Create coupon</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Input
                placeholder="CODE"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon((p) => ({ ...p, code: e.target.value }))}
                className="max-w-[120px]"
              />
              <select
                className="h-10 rounded-md border px-2 text-sm"
                value={newCoupon.discountType}
                onChange={(e) => setNewCoupon((p) => ({ ...p, discountType: e.target.value }))}
              >
                <option value="FLAT">Flat ₹</option>
                <option value="PERCENT">Percent %</option>
              </select>
              <Input
                type="number"
                placeholder="Value"
                value={newCoupon.discountValue}
                onChange={(e) => setNewCoupon((p) => ({ ...p, discountValue: e.target.value }))}
                className="max-w-[100px]"
              />
              <Input
                type="number"
                placeholder="Min order"
                value={newCoupon.minOrderAmount}
                onChange={(e) => setNewCoupon((p) => ({ ...p, minOrderAmount: e.target.value }))}
                className="max-w-[100px]"
              />
              <Button onClick={createCoupon} disabled={!newCoupon.code}>Create</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.code}</TableCell>
                      <TableCell>{c.discountType}</TableCell>
                      <TableCell>{c.discountValue}{c.discountType === "PERCENT" ? "%" : " ₹"}</TableCell>
                      <TableCell>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? "success" : "secondary"}>
                          {c.isActive ? "Active" : "Off"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => toggleCoupon(c.id)}>
                          Toggle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approved drivers on map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>{liveDrivers.length} drivers with GPS</span>
                <span>· updates every 10s + live socket</span>
              </div>
              <div className="h-[420px] overflow-hidden rounded-lg border">
                {liveMarkers.length > 0 ? (
                  <LiveMap markers={liveMarkers} className="h-full" />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">
                    No driver locations yet. Approved drivers appear when they go online.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vehicle pricing rules</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Base ₹</TableHead>
                    <TableHead>Per km</TableHead>
                    <TableHead>Per min</TableHead>
                    <TableHead>Min fare</TableHead>
                    <TableHead>Peak surge</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingRules.map((rule) => (
                    <PricingRuleRow key={rule.vehicleType} rule={rule} onSave={savePricing} />
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
