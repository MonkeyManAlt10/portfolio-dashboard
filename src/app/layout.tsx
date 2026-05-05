import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { EditModeProvider } from "@/components/EditModeContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Austin Krauskopf — Portfolio Dashboard",
  description:
    "Personal investment dashboard tracking Roth IRA, brokerage, and factor strategy accounts.",
  openGraph: {
    title: "Austin Krauskopf — Portfolio Dashboard",
    description: "Personal investment dashboard with live prices.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col" style={{ backgroundColor: "#0b1120", color: "#f1f5f9" }}>
        <EditModeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#131c2f",
                color: "#f1f5f9",
                border: "1px solid #1f2a44",
                fontFamily: "var(--font-inter)",
              },
              success: { iconTheme: { primary: "#10b981", secondary: "#131c2f" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#131c2f" } },
            }}
          />
        </EditModeProvider>
      </body>
    </html>
  );
}
