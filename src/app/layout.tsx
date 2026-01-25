import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BhCaptureCo",
  description: "Marketable",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="font-bold text-xl text-gray-900">BhCaptureCo</div>
              <nav className="flex space-x-4">
                <span className="text-gray-500">Nav Placeholder</span>
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
        <footer className="bg-white border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-center text-sm text-gray-500">
              © 2023 BhCaptureCo. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
