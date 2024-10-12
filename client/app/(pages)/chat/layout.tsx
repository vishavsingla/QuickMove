"use client";

import { useAppSelector } from "@/app/redux/hooks";
import { SocketProvider } from "@/context/SockerProvider";
import { permanentRedirect, redirect, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
    const sessionToken = useAppSelector((state) => state.sessionToken.value);
    const router = useRouter();
    const [isInitialRender, setIsInitialRender] = useState(true);

    return (
        <SocketProvider>
            <div className="">
              {children}
              </div>
        </SocketProvider>
    );

}
