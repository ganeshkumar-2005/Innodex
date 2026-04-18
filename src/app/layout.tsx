import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Innodex | AI Startup Feasibility Analyzer',
  description: 'AI-powered startup feasibility partner',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="background-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        {children}
      </body>
    </html>
  );
}
