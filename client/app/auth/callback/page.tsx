"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, tokenStore } from "@/lib/api";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import type { Role } from "@/lib/types";

const HOME: Record<Role, string> = {
  USER: "/book",
  DRIVER: "/driver",
  ADMIN: "/admin",
};

function OAuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setSession } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const token = params.get("token");
    const refreshToken = params.get("refreshToken");

    if (!token) {
      toast({ title: "Sign-in failed", variant: "destructive" });
      router.replace("/login");
      return;
    }

    tokenStore.set(token);
    if (refreshToken) tokenStore.setRefresh(refreshToken);

    (async () => {
      try {
        const me = await api.me();
        setSession({
          token,
          refreshToken: refreshToken ?? undefined,
          user: me.user,
          role: me.role as Role,
          driverId: me.user?.driver?.id ?? params.get("driverId"),
        });
        toast({ title: "Signed in with Google" });
        router.replace(HOME[me.role as Role] ?? "/book");
      } catch {
        toast({ title: "Could not complete sign-in", variant: "destructive" });
        router.replace("/login");
      }
    })();
  }, [params, router, setSession, toast]);

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Completing sign-in…
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
