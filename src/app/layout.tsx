import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doccare-delta.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "DocCare — Endocrine Practice Management",
    template: "%s | DocCare EMR",
  },
  description:
    "A modern, full-stack medical practice management system built for endocrinology clinics. Streamline patient records, appointments, consultations, prescriptions, billing, and laboratory workflows.",
  keywords: [
    "EMR", "endocrine", "endocrinology", "clinic management", "electronic medical records",
    "patient records", "medical practice", "prescriptions", "billing", "laboratory", "India",
  ],
  authors: [{ name: "DocCare" }],
  creator: "DocCare",
  publisher: "DocCare",
  formatDetection: { telephone: true, email: true, address: true },
  openGraph: {
    type: "website",
    siteName: "DocCare EMR",
    title: "DocCare — Endocrine Practice Management System",
    description:
      "Modern, full-stack medical practice management built for endocrinology clinics.",
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "DocCare — Endocrine Practice Management",
    description:
      "Modern, full-stack medical practice management built for endocrinology clinics.",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalClinic",
              name: "DocCare Clinic",
              description:
                "Endocrine practice management system — electronic medical records, patient scheduling, and clinical workflow.",
              medicalSpecialty: "Endocrinology",
              url: BASE_URL,
              availableService: [
                {
                  "@type": "MedicalProcedure",
                  name: "Patient Consultation & SOAP Notes",
                },
                {
                  "@type": "MedicalProcedure",
                  name: "Prescription Management",
                },
                {
                  "@type": "MedicalTest",
                  name: "Laboratory Order & Result Management",
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-bg font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            className: "!bg-surface !border-border !text-primary !rounded-xl !text-sm !shadow-lg",
          }}
        />
      </body>
    </html>
  );
}
