import type { Metadata } from "next";
import "./globals.css";
import "./print.css";

export const metadata: Metadata = {
  title: "Laundry Management · Linen Out",
  description: "Phase 1 laundry dispatch prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
