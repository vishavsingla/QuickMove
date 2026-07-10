"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useSocket } from "@/context/SocketProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChatMessage, Role } from "@/lib/types";

export function ChatPanel({
  bookingId,
  userId,
  role,
  title = "Chat",
  bare = false,
}: {
  bookingId: string;
  userId: string;
  role: Role;
  title?: string;
  bare?: boolean;
}) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(() => {
    api
      .getChatMessages(bookingId)
      .then((r) => setMessages(r.messages))
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  // Join the booking room so chat:message / chat:typing events are delivered.
  useEffect(() => {
    if (!socket || !bookingId) return;
    const join = () => socket.emit("booking:join", { bookingId });
    join();
    socket.on("connect", join);
    return () => {
      socket.off("connect", join);
      socket.emit("booking:leave", { bookingId });
    };
  }, [socket, bookingId]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = (msg: ChatMessage) => {
      if (msg.bookingId === bookingId)
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
    };
    const onTyping = (p: { bookingId: string; userId: string; isTyping: boolean }) => {
      if (p.bookingId !== bookingId || p.userId === userId) return;
      setTypingUser(p.isTyping ? p.userId : null);
    };
    socket.on("chat:message", onMsg);
    socket.on("chat:typing", onTyping);
    return () => {
      socket.off("chat:message", onMsg);
      socket.off("chat:typing", onTyping);
    };
  }, [socket, bookingId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  const send = () => {
    const body = text.trim();
    if (!body || !socket || !socket.connected) return;
    socket.emit("chat:send", {
      bookingId,
      senderUserId: userId,
      senderRole: role,
      body,
    });
    setText("");
    socket.emit("chat:typing", { bookingId, userId, isTyping: false });
  };

  const onChange = (value: string) => {
    setText(value);
    if (!socket) return;
    socket.emit("chat:typing", { bookingId, userId, isTyping: value.length > 0 });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("chat:typing", { bookingId, userId, isTyping: false });
    }, 1500);
  };

  const panel = (
    <>
      {!bare && (
        <CardHeader className="py-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={bare ? "p-0 space-y-3" : "space-y-3"}>
        <div className="h-56 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
          {loading ? (
            <div className="grid h-full place-items-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="p-2 text-center text-muted-foreground">No messages yet.</p>
          ) : (
            messages.map((m) => {
              const mine = m.senderUserId === userId;
              return (
                <div
                  key={m.id}
                  className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                      mine ? "bg-primary text-primary-foreground" : "bg-background border"
                    }`}
                  >
                    <p className="text-[10px] opacity-70">
                      {mine
                        ? "You"
                        : m.senderRole === "DRIVER"
                          ? "Driver"
                          : m.senderRole === "USER"
                            ? "Customer"
                            : m.senderRole}
                    </p>
                    <p>{m.body}</p>
                  </div>
                </div>
              );
            })
          )}
          {typingUser && (
            <p className="text-xs text-muted-foreground">Typing…</p>
          )}
          <div ref={bottomRef} />
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Input
            value={text}
            onChange={(e) => onChange(e.target.value)}
            placeholder={socket?.connected ? "Type a message…" : "Connecting…"}
            maxLength={2000}
            disabled={!socket?.connected}
          />
          <Button type="submit" size="icon" disabled={!text.trim() || !socket?.connected}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </>
  );

  if (bare) return panel;

  return <Card>{panel}</Card>;
}
