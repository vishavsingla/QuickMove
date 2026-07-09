"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { RequireRole } from "@/components/RequireRole";
import { AddressSearch } from "@/components/AddressSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { PlaceResult, SavedAddress } from "@/lib/types";

function ProfileInner() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newLabel, setNewLabel] = useState("Home");
  const [newPlace, setNewPlace] = useState<PlaceResult | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [p, a] = await Promise.all([api.getProfile(), api.listAddresses()]);
    setProfile(p.user);
    setName(p.user.name ?? "");
    setPhone(p.user.phoneNumber ?? "");
    setAddresses(a.addresses);
  };

  useEffect(() => {
    load();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const r = await api.updateProfile({ name, phoneNumber: phone });
      setProfile(r.user);
      toast({ title: "Profile updated" });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof ApiError ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addAddress = async () => {
    if (!newPlace) return;
    try {
      await api.createAddress({
        label: newLabel,
        address: newPlace.displayName,
        lat: newPlace.lat,
        lng: newPlace.lng,
        isDefault: addresses.length === 0,
      });
      setNewPlace(null);
      load();
      toast({ title: "Address saved" });
    } catch {
      toast({ title: "Could not save address", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    await api.deleteAddress(id);
    load();
  };

  if (!profile)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <p className="text-sm text-muted-foreground">Email: {profile.email}</p>
          <p className="text-sm text-muted-foreground">
            {profile._count?.bookings ?? 0} bookings
          </p>
          <Button onClick={saveProfile} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Saved addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
          ) : (
            <ul className="space-y-2">
              {addresses.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div className="flex gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{a.label}</span>
                      {a.isDefault && (
                        <span className="ml-2 text-xs text-primary">Default</span>
                      )}
                      <p className="text-muted-foreground">{a.address}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 border-t pt-4">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Home, Office…"
              />
            </div>
            <AddressSearch
              label="Address"
              placeholder="Search to add"
              value={newPlace}
              onSelect={setNewPlace}
            />
            <Button onClick={addAddress} disabled={!newPlace}>
              Add address
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireRole role="USER">
      <ProfileInner />
    </RequireRole>
  );
}
