"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import type { Role } from "@/lib/types";

export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { user, role: currentRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${role.toLowerCase()}`);
    } else if (currentRole !== role) {
      router.replace("/");
    }
  }, [user, currentRole, loading, role, router]);

  if (loading || !user || currentRole !== role) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <>{children}</>;
}
