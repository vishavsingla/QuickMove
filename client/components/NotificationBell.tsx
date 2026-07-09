"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import type { AppNotification } from "@/lib/types";
import { useSocket } from "@/context/SocketProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const { socket } = useSocket();
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await api.notifications();
      setItems(res.notifications);
      setUnread(res.unread);
    } catch {
      /* not logged in yet */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onNotification = (n: AppNotification) => {
      setItems((prev) => [n, ...prev].slice(0, 100));
      setUnread((u) => u + 1);
      toast({ title: n.type.replace(/_/g, " "), description: n.message });
    };
    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [socket, toast]);

  const markAll = async () => {
    await api.markRead("all");
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && unread > 0 && markAll()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2 text-sm font-semibold">Notifications</div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            items.map((n) => (
              <div key={n.id} className="border-b px-3 py-2 last:border-0">
                <p className="text-xs font-medium">{n.type.replace(/_/g, " ")}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
