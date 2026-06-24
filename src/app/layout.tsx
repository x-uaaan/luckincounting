import type { Metadata } from "next";
import "./globals.css";
import ItemsStoreInit from "@/components/ItemsStoreInit";

export const metadata: Metadata = {
  title: "Luckin Counting",
  description: "Daily inventory counting app",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-dark">
        <ItemsStoreInit />
        {children}
      </body>
    </html>
  );
}
