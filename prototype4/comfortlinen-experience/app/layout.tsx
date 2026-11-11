import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title: 'ComfortLinen — Comfort, by nature',
 description: 'Enter a more considered world of linen. Thoughtful linen hire, water recycling and expert laundry care for hospitality across the South West.',
 metadataBase: new URL('https://comfortlinen-a-softer-world.manusara.chatgpt.site'),
 icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="en"><body>{children}</body></html>;
}
