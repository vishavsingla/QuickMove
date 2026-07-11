"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { AuthConfig, Role } from "@/lib/types";

const HOME: Record<Role, string> = {
  USER: "/book",
  DRIVER: "/driver",
  ADMIN: "/admin",
};

export default function LoginPage() {
  const { setSession } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    api.getAuthConfig().then(setAuthConfig).catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.loginUser(email, password);
      setSession(res);
      toast({ title: "Welcome back", description: `Signed in as ${res.role}` });
      router.push(HOME[res.role]);
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof ApiError ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container grid min-h-[calc(100vh-4rem)] place-items-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Log in to your QuickMove account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log in
            </Button>
          </form>

          {authConfig?.googleOAuth.enabled && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = api.googleOAuthUrl();
                }}
              >
                Continue with Google
              </Button>
            </>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="font-medium text-foreground underline">
              Create an account
            </Link>
          </p>
          <p className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            Demo: <b>user@quickmove.dev</b> / <b>admin@quickmove.dev</b> /{" "}
            <b>ravi.driver@quickmove.dev</b> — password <b>password123</b>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
