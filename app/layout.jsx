import './globals.css';

export const metadata = {
  title: 'LW Dashboard',
  description: 'LaWayra live sales + marketing dashboard'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3F4021'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
