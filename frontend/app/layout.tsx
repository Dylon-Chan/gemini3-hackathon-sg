import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SingFlix — Singapore Time Travel",
  description:
    "Upload a photo of any Singapore location and watch it transform across time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${outfit.className} bg-zinc-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
