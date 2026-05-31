/* eslint-disable @next/next/no-page-custom-font */
import "./globals.css";

export const metadata = {
  title: "Pastel QR Generator",
  description: "Create QR codes for URL, text, WiFi, and vCard with pastel styling.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
