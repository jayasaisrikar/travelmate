'use client';

import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full z-50 border-b border-slate-200 backdrop-blur-md bg-white/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded" />
            <span className="text-lg font-semibold">TravelMate</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition text-sm">Dashboard</Link>
            <button className="text-slate-600 hover:text-slate-900 transition text-sm">Sign Out</button>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
