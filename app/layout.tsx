import "./globals.css";

export const metadata = {
  title: "VintagEbay",
  description: "Search eBay for vintage clothing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
