"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyEmailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    (async () => {
      try {
        const res = await api.verifyEmail(token);
        setStatus("ok");
        setMessage(res.message);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Verification failed");
      }
    })();
  }, [params]);

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <CardTitle>Email verification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "loading" && <Loader2 className="mx-auto h-8 w-8 animate-spin" />}
        {status === "ok" && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <p>{message}</p>
            <Button onClick={() => router.push("/profile")}>Go to profile</Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <p className="text-muted-foreground">{message}</p>
            <Button asChild variant="outline">
              <Link href="/profile">Back to profile</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="container grid min-h-[calc(100vh-4rem)] place-items-center py-10">
      <Suspense
        fallback={
          <Card className="w-full max-w-md p-8">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          </Card>
        }
      >
        <VerifyEmailInner />
      </Suspense>
    </div>
  );
}
