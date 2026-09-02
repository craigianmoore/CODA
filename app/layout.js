import "./globals.css";

export const metadata = {
  title: "CODA — Coach Observation Development App",
  description: "Football Victoria coach observation and diploma assessment tool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
