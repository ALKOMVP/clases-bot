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
    <nav className="bg-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold">
              Clases Bot
            </Link>
            <Link href="/usuarios" className="hover:text-purple-200 transition-colors">
              Alumnos
            </Link>
            <Link href="/clases" className="hover:text-purple-200 transition-colors">
              Clases
            </Link>
            <Link href="/reservas" className="hover:text-purple-200 transition-colors">
              Reservas
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="hover:text-purple-200 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  );
}

