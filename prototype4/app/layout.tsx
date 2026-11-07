import type { Metadata } from "next";
import { APP_NAME } from "../lib/branding";
import { themeInitScript } from "../lib/theme";
import "./globals.css";
import "./platform.css";
import "./receiving.css";
import "./outgoing.css";
import "./deliveries.css";
import "./workspace.css";
import "./dashboard.css";
import "./icons.css";
import "./dark.css";
import "./dark-operations.css";
import "./dark-platform.css";
import "./print.css";

export const metadata: Metadata = {
  title: `${APP_NAME} · Laundry Management`,
  description: "Touch-friendly laundry receiving and dispatch prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head><body>{children}</body></html>;
}
