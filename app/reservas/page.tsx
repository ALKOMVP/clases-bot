'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

interface Reserva {
  usuario_id: number;
  clase_id: number;
  dia: string;
  hora: string;
  created_at: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  clase_nombre?: string;
}

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
}

interface Clase {
  id: number;
  dia: string;
  hora: string;
  nombre: string;
}

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    usuario_id: 0,
    clase_id: 0,
  });

  useEffect(() => {
    loadReservas();
    loadUsuarios();
    loadClases();
  }, []);

  const loadReservas = async () => {
    try {
      const res = await fetch('/api/reservas');
      const data = await res.json();
      if (Array.isArray(data)) {
        setReservas(data);
      } else {
        setReservas([]);
      }
    } catch (error) {
      console.error('Error loading reservas:', error);
      setReservas([]);
    }
  };

  const loadUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsuarios(data);
      } else {
        setUsuarios([]);
      }
    } catch (error) {
      console.error('Error loading usuarios:', error);
      setUsuarios([]);
    }
  };

  const loadClases = async () => {
    try {
      const res = await fetch('/api/clases');
      const data = await res.json();
      if (Array.isArray(data)) {
        setClases(data);
      } else {
        setClases([]);
      }
    } catch (error) {
      console.error('Error loading clases:', error);
      setClases([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = '/api/reservas';
    const method = 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: formData.usuario_id,
        clase_id: formData.clase_id,
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setFormData({
        usuario_id: 0,
        clase_id: 0,
      });
      loadReservas();
    } else {
      const error = await res.json();
      alert(error.error || 'Error al guardar');
    }
  };

  const handleDelete = async (usuario_id: number, clase_id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta reserva?')) return;

    const res = await fetch(`/api/reservas?usuario_id=${usuario_id}&clase_id=${clase_id}`, { method: 'DELETE' });
    if (res.ok) {
      loadReservas();
    } else {
      alert('Error al eliminar');
    }
  };

  const getDiaNombre = (dia: string) => {
    const dias: { [key: string]: string } = {
      'Lun': 'Lunes',
      'Mar': 'Martes',
      'Jue': 'Jueves',
      'Sab': 'Sábado'
    };
    return dias[dia] || dia;
  };

  // Filtrar reservas según el término de búsqueda
  const filteredReservas = reservas.filter(reserva => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (reserva.nombre || '').toLowerCase().includes(search) ||
      (reserva.apellido || '').toLowerCase().includes(search) ||
      (reserva.email || '').toLowerCase().includes(search) ||
      getDiaNombre(reserva.dia).toLowerCase().includes(search) ||
      reserva.dia.toLowerCase().includes(search) ||
      reserva.hora.toLowerCase().includes(search) ||
      (reserva.clase_nombre || '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Reservas</h1>
          <button
            onClick={() => {
              setShowForm(true);
              setFormData({
                usuario_id: 0,
                clase_id: 0,
              });
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            + Nueva Reserva
          </button>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por alumno, día, hora o clase..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600">
              Mostrando {filteredReservas.length} de {reservas.length} reservas
            </p>
          )}
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-semibold mb-4">
              Nueva Reserva
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alumno *
                  </label>
                  <select
                    value={formData.usuario_id}
                    onChange={(e) => setFormData({ ...formData, usuario_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="0">Seleccionar alumno</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.apellido}, {u.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clase *
                  </label>
                  <select
                    value={formData.clase_id}
                    onChange={(e) => setFormData({ ...formData, clase_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="0">Seleccionar clase</option>
                    {clases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.dia} {c.hora} - {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alumno</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clase</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReservas.map((reserva) => (
                <tr key={`${reserva.usuario_id}-${reserva.clase_id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {reserva.apellido}, {reserva.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reserva.dia}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reserva.hora}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reserva.clase_nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDelete(reserva.usuario_id, reserva.clase_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

