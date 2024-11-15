import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToggleTheme from "./components/ToggleTheme";
import { ThemeProvider } from "./components/theme-provider";
import StoreProvider from './StoreProvider';
import {SocketProvider} from "@/context/SockerProvider";
import { cookies } from 'next/headers';
import { getCookie } from 'cookies-next';
const sessionToken = getCookie('sessionToken', {cookies});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Create Next App",
    description: "Generated by create next app",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    
    return (
        <html lang="en">
            
            <body className={inter.className}>
                <StoreProvider>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <SocketProvider>
                    {children}
                    </SocketProvider>
                </ThemeProvider>
                </StoreProvider>
            </body>
        </html>
    );
}
