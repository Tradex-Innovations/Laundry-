import type { Metadata } from "next";
import "./globals.css";
import "./platform.css";
import "./receiving.css";
import "./outgoing.css";
import "./deliveries.css";
import "./print.css";

export const metadata: Metadata = {
  title: "Pure Linen · Laundry Management",
  description: "Touch-friendly laundry receiving and dispatch prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
