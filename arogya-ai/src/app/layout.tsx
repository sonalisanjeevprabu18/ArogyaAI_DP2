import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArogyaAI – Your Digital Health Sanctuary",
  description: "Empower your wellness journey through intelligent document synthesis, mental health support, and radically positive care guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
