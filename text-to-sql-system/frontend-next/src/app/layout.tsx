import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/sidebar-provider";
import { DataProvider } from "@/components/data-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetBrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "NaturalSQL - AI Data Studio",
  description: "Context-aware SQL assistant and analytics workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetBrains.variable}`}>
        <SidebarProvider>
          <DataProvider>{children}</DataProvider>
        </SidebarProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
