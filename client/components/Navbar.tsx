"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Truck, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ToggleTheme from "@/app/components/ToggleTheme";
import { NotificationBell } from "./NotificationBell";

export function Navbar() {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const links =
    role === "USER"
      ? [
          { href: "/book", label: "Book a move" },
          { href: "/bookings", label: "My bookings" },
          { href: "/wallet", label: "Wallet" },
          { href: "/profile", label: "Profile" },
        ]
      : role === "DRIVER"
      ? [
          { href: "/driver", label: "Dashboard" },
          { href: "/driver/earnings", label: "Earnings" },
        ]
      : role === "ADMIN"
      ? [{ href: "/admin", label: "Admin" }]
      : [];

  const onLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-5 w-5" />
          </span>
          QuickMove
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                pathname.startsWith(l.href) && "text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && <NotificationBell />}
          <ToggleTheme />
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.name}
              </span>
              <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
