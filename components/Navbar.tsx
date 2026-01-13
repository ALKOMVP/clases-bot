'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-purple-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo y menú desktop */}
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8">
            <Link href="/" className="text-lg sm:text-xl font-bold whitespace-nowrap" onClick={closeMenu}>
              Clases Bot
            </Link>
            {/* Menú desktop - oculto en mobile */}
            <div className="hidden md:flex items-center space-x-2 sm:space-x-4 lg:space-x-8">
              <Link href="/usuarios" className="hover:text-purple-200 transition-colors text-sm sm:text-base whitespace-nowrap">
                Alumnos
              </Link>
              <Link href="/clases" className="hover:text-purple-200 transition-colors text-sm sm:text-base whitespace-nowrap">
                Clases
              </Link>
              <Link href="/calendario" className="hover:text-purple-200 transition-colors text-sm sm:text-base whitespace-nowrap">
                Calendario
              </Link>
              <Link href="/cancelaciones" className="hover:text-purple-200 transition-colors text-sm sm:text-base whitespace-nowrap">
                Cancelaciones
              </Link>
              <Link href="/asignaciones-temporales" className="hover:text-purple-200 transition-colors text-sm sm:text-base whitespace-nowrap">
                Asignaciones Temporales
              </Link>
            </div>
          </div>

          {/* Botón hamburguesa (solo mobile) y botón salir */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Botón hamburguesa - solo visible en mobile */}
            <button
              onClick={toggleMenu}
              className="md:hidden p-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <button
              onClick={handleLogout}
              className="hover:text-purple-200 transition-colors text-xs sm:text-sm whitespace-nowrap px-2 sm:px-0"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Menú mobile - colapsable */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-purple-500 py-2">
            <div className="flex flex-col space-y-1">
              <Link
                href="/usuarios"
                className="px-4 py-2 hover:bg-purple-700 transition-colors text-sm"
                onClick={closeMenu}
              >
                Alumnos
              </Link>
              <Link
                href="/clases"
                className="px-4 py-2 hover:bg-purple-700 transition-colors text-sm"
                onClick={closeMenu}
              >
                Clases
              </Link>
              <Link
                href="/calendario"
                className="px-4 py-2 hover:bg-purple-700 transition-colors text-sm"
                onClick={closeMenu}
              >
                Calendario
              </Link>
              <Link
                href="/cancelaciones"
                className="px-4 py-2 hover:bg-purple-700 transition-colors text-sm"
                onClick={closeMenu}
              >
                Cancelaciones
              </Link>
              <Link
                href="/asignaciones-temporales"
                className="px-4 py-2 hover:bg-purple-700 transition-colors text-sm"
                onClick={closeMenu}
              >
                Asignaciones Temporales
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

