import ClientLayout from "@/components/ClientLayout/ClientLayout";
import { Bellefair, Inter } from "next/font/google";
import "./globals.css";

const bellefair = Bellefair({
  variable: "--font-bellefair",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "Muirfield | TPMCALOON LTD",
  description: "Muirfield by TPMCALOON LTD",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bellefair.variable} ${inter.variable}`}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
