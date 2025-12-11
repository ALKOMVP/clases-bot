'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface Stats {
  usuarios: number;
  clases: number;
  reservas: number;
}

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  activo: boolean;
}

interface Reserva {
  id: number;
  usuario_id: number;
  clase_id: number;
  nombre: string;
  apellido: string;
  dia: string;
  hora: string;
  clase_nombre?: string;
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats>({ usuarios: 0, clases: 0, reservas: 0 });
  const [loading, setLoading] = useState(true);
  const [alumnosDesactivados, setAlumnosDesactivados] = useState<Usuario[]>([]);
  const [reservasRecientes, setReservasRecientes] = useState<Reserva[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usuariosRes, clasesRes, reservasRes] = await Promise.all([
          fetch('/api/usuarios'),
          fetch('/api/clases'),
          fetch('/api/reservas'),
        ]);

        const usuarios = await usuariosRes.json();
        const clases = await clasesRes.json();
        const reservas = await reservasRes.json();

        // Filtrar y obtener primeros 5 alumnos desactivados
        // El campo activo puede venir como boolean false o como número 0
        const desactivados = Array.isArray(usuarios) 
          ? usuarios.filter((u: any) => {
              const activo = u.activo;
              return activo === false || activo === 0 || activo === '0' || activo === null || activo === undefined;
            }).slice(0, 5)
          : [];
        setAlumnosDesactivados(desactivados);

        // Obtener primeras 5 reservas aleatorias/recientes
        const reservasAleatorias = Array.isArray(reservas) 
          ? reservas.slice(0, 5)
          : [];
        setReservasRecientes(reservasAleatorias);

        setStats({
          usuarios: Array.isArray(usuarios) ? usuarios.length : 0,
          clases: Array.isArray(clases) ? clases.length : 0,
          reservas: Array.isArray(reservas) ? reservas.length : 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8">
          Dashboard
        </h1>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando estadísticas...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {stats.usuarios}
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">Alumnos Registrados</p>
              <Link
                href="/usuarios"
                className="text-purple-600 hover:text-purple-700 mt-3 sm:mt-4 inline-block text-sm sm:text-base"
              >
                Ver alumnos →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {stats.clases}
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">Clases Disponibles</p>
              <Link
                href="/clases"
                className="text-purple-600 hover:text-purple-700 mt-3 sm:mt-4 inline-block text-sm sm:text-base"
              >
                Ver clases →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {stats.reservas}
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">Reservas Activas</p>
              <Link
                href="/calendario"
                className="text-purple-600 hover:text-purple-700 mt-3 sm:mt-4 inline-block text-sm sm:text-base"
              >
                Ver calendario →
              </Link>
            </div>
          </div>
        )}

        {/* Alumnos Desactivados */}
        {alumnosDesactivados.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Alumnos Desactivados
              </h2>
              <Link
                href="/usuarios?filter=desactivados"
                className="text-purple-600 hover:text-purple-700 text-sm sm:text-base"
              >
                Ver todos →
              </Link>
            </div>
            <div className="space-y-3">
              {alumnosDesactivados.map((alumno) => (
                <div
                  key={alumno.id}
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {alumno.nombre} {alumno.apellido}
                    </p>
                    <p className="text-sm text-gray-600">{alumno.telefono}</p>
                  </div>
                  <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                    Desactivado
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reservas Recientes */}
        {reservasRecientes.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Inscripciones Recientes
              </h2>
              <Link
                href="/calendario"
                className="text-purple-600 hover:text-purple-700 text-sm sm:text-base"
              >
                Ver todas →
              </Link>
            </div>
            <div className="space-y-3">
              {reservasRecientes.map((reserva) => (
                <div
                  key={reserva.id}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {reserva.nombre} {reserva.apellido}
                    </p>
                    <p className="text-sm text-gray-600">
                      {reserva.dia} {reserva.hora}
                      {reserva.clase_nombre && ` - ${reserva.clase_nombre}`}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                    Activa
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Accesos Rápidos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Link
              href="/usuarios"
              className="block p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Gestionar Alumnos</h3>
              <p className="text-sm text-gray-600">
                Agregar, editar o eliminar alumnos del sistema
              </p>
            </Link>
            <Link
              href="/clases"
              className="block p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Gestionar Clases</h3>
              <p className="text-sm text-gray-600">
                Ver y administrar los horarios de clases disponibles
              </p>
            </Link>
            <Link
              href="/calendario"
              className="block p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-2">Ver Calendario</h3>
              <p className="text-sm text-gray-600">
                Ver el calendario de clases de los próximos 30 días
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
