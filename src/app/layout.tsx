import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import DemoLauncher from "@/components/DemoLauncher";
import AppToaster from "@/components/feedback/AppToaster";
import ConfirmHost from "@/components/feedback/ConfirmHost";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} | Barbershop Booking Online`,
  description: BRAND_DESCRIPTION,
};

export const viewport: Viewport = {
  themeColor: "#0369a1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
        <AppToaster />
        <ConfirmHost />
        <DemoLauncher />
      </body>
    </html>
  );
}
