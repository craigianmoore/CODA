import "./globals.css";
import { Oswald, Inter } from "next/font/google";

const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  title: "CODA — Coach Observation Development App",
  description: "Football Victoria coach observation and diploma assessment tool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${oswald.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
