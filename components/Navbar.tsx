'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="bg-purple-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto">
            <Link href="/" className="text-lg sm:text-xl font-bold whitespace-nowrap">
              Clases Bot
            </Link>
            <Link href="/usuarios" className="hover:text-purple-200 transition-colors text-sm sm:text-base whitespace-nowrap">
              Alumnos
            </Link>
            <Link href="/clases" className="hover:text-purple-200 transition-colors text-sm sm:text-base whitespace-nowrap">
              Clases
            </Link>
            <Link href="/calendario" className="hover:text-purple-200 transition-colors text-sm sm:text-base whitespace-nowrap">
              Calendario
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="hover:text-purple-200 transition-colors text-xs sm:text-sm whitespace-nowrap px-2 sm:px-0"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}

