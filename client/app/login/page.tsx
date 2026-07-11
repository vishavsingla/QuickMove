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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    api.getAuthConfig().then(setAuthConfig).catch(() => undefined);
  }, []);

  const testMode = authConfig?.otp.stubExpose ?? authConfig?.otp.debug;
  const googleMock = authConfig?.googleOAuth.mode === "mock";

  const passwordLogin = async (e: React.FormEvent) => {
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

  const sendPhoneOtp = async () => {
    if (phone.trim().length < 8) return;
    setLoading(true);
    try {
      const res = await api.sendPhoneLoginOtp(phone.trim());
      setOtpSent(true);
      const demo = res.debugOtp ?? res.otp;
      if (demo) setDebugOtp(demo);
      toast({
        title: "OTP sent",
        description: demo ? `Test mode code: ${demo}` : "Check your messages",
      });
    } catch (err) {
      toast({
        title: "Could not send OTP",
        description: err instanceof ApiError ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setLoading(true);
    try {
      const res = await api.verifyPhoneLoginOtp(phone.trim(), otp);
      setSession(res);
      toast({ title: "Signed in with phone" });
      router.push(HOME[res.role]);
    } catch (err) {
      toast({
        title: "Verification failed",
        description: err instanceof ApiError ? err.message : "",
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
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Log in to your QuickMove account</CardDescription>
            </div>
            {testMode && (
              <Badge variant="warning" className="shrink-0 text-[10px]">
                Test mode
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="phone">Phone OTP</TabsTrigger>
              <TabsTrigger value="google" disabled={!authConfig?.googleOAuth.enabled}>
                Google
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={passwordLogin} className="space-y-4 pt-2">
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
            </TabsContent>

            <TabsContent value="phone">
              <form onSubmit={verifyPhoneOtp} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Mobile number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                {!otpSent ? (
                  <Button
                    type="button"
                    className="w-full"
                    disabled={loading || phone.trim().length < 8}
                    onClick={sendPhoneOtp}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send OTP
                  </Button>
                ) : (
                  <>
                    {debugOtp && (
                      <p className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                        Test mode OTP: <b>{debugOtp}</b>
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="otp">6-digit code</Label>
                      <Input
                        id="otp"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Verify & sign in
                    </Button>
                  </>
                )}
              </form>
            </TabsContent>

            <TabsContent value="google">
              <div className="space-y-4 pt-2">
                {googleMock && (
                  <p className="text-xs text-muted-foreground">
                    Mock OAuth — creates a demo user without real Google keys.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    window.location.href = api.googleOAuthUrl();
                  }}
                >
                  Continue with Google
                  {googleMock && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      mock
                    </Badge>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

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
