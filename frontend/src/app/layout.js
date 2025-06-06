// frontend/src/app/layout.js
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Link In Bio Platform',
  description: 'Create your link in bio page and receive support!',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <main>{children}</main>
        {/* You could add a global Toaster component here for notifications */}
      </body>
    </html>
  );
}