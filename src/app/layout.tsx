import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Mine — Personal diary", description: "A quiet place for your everyday stories." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
