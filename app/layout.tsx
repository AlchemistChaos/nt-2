import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/providers/query-provider";
import { AuthenticatedFloatingChat } from "@/components/custom/AuthenticatedFloatingChat";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nutrition Hero - AI-Powered Nutrition Tracking",
  description: "Track your meals, plan your nutrition, and get personalized dietary guidance with AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          {children}
          <AuthenticatedFloatingChat />
        </QueryProvider>
      </body>
    </html>
  );
}
