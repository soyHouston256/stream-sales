import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stream Sales - Login & Dashboard',
  description: 'Stream Sales application with DDD architecture',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
