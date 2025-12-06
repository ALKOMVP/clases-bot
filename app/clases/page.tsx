'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { fetchWithErrorHandling } from '@/lib/frontend-error-handler';

interface Clase {
  id: number;
  dia: string;
  hora: string;
  nombre: string;
}

export default function ClasesPage() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    dia: 'Lun',
    hora: '',
    nombre: 'Yoga',
  });

  useEffect(() => {
    loadClases();
  }, []);

  const loadClases = async () => {
    try {
      const res = await fetchWithErrorHandling('/api/clases', {}, {
        route: '/api/clases',
        operation: 'load_clases'
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setClases(data);
      } else {
        setClases([]);
      }
    } catch (error: any) {
      console.error('Error loading clases:', error);
      alert(error.message || 'Error al cargar clases');
      setClases([]);
    }
  };

  const handleInitialize = async () => {
    if (!confirm('¿Inicializar las clases semanales fijas? Esto solo funcionará si no hay clases existentes.')) return;
    
    setLoading(true);
    try {
      await fetchWithErrorHandling('/api/clases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, {
        route: '/api/clases',
        operation: 'initialize_clases'
      });

      alert('Clases inicializadas correctamente');
      loadClases();
    } catch (error: any) {
      alert(error.message || 'Error al inicializar clases');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.dia || !formData.hora || !formData.nombre) {
      alert('Por favor completa todos los campos');
      return;
    }

    // Validar formato de hora (HH:MM)
    const horaRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(formData.hora)) {
      alert('Formato de hora inválido. Use HH:MM (ej: 17:30)');
      return;
    }

    setLoading(true);
    try {
      await fetchWithErrorHandling('/api/clases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      }, {
        route: '/api/clases',
        operation: 'create_clase'
      });

      setShowForm(false);
      setFormData({ dia: 'Lun', hora: '', nombre: 'Yoga' });
      loadClases();
    } catch (error: any) {
      alert(error.message || 'Error al crear clase');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta clase? Esto también eliminará todas las reservas asociadas.')) return;

    try {
      await fetchWithErrorHandling(`/api/clases?id=${id}`, { method: 'DELETE' }, {
        route: '/api/clases',
        operation: 'delete_clase'
      });
      loadClases();
    } catch (error: any) {
      alert(error.message || 'Error al eliminar');
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

  // Filtrar clases según el término de búsqueda
  const filteredClases = clases.filter(clase => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      getDiaNombre(clase.dia).toLowerCase().includes(search) ||
      clase.dia.toLowerCase().includes(search) ||
      clase.hora.toLowerCase().includes(search) ||
      clase.nombre.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Clases Semanales</h1>
            <p className="text-gray-600 mt-2">Horarios fijos que se repiten todas las semanas</p>
          </div>
          <div className="flex gap-2">
            {clases.length === 0 && (
              <button
                onClick={handleInitialize}
                disabled={loading}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Inicializando...' : 'Inicializar Clases'}
              </button>
            )}
            <button
              onClick={() => {
                setShowForm(true);
                setFormData({ dia: 'Lun', hora: '', nombre: 'Yoga' });
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              + Nueva Clase
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-semibold mb-4">Nueva Clase</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Día *
                  </label>
                  <select
                    value={formData.dia}
                    onChange={(e) => setFormData({ ...formData, dia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="Lun">Lunes</option>
                    <option value="Mar">Martes</option>
                    <option value="Jue">Jueves</option>
                    <option value="Sab">Sábado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora * (HH:MM)
                  </label>
                  <input
                    type="text"
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    placeholder="17:30"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                    pattern="^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ dia: 'Lun', hora: '', nombre: 'Yoga' });
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Buscador */}
        {clases.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por día, hora o nombre..."
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
                Mostrando {filteredClases.length} de {clases.length} clases
              </p>
            )}
          </div>
        )}

        {clases.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">No hay clases inicializadas.</p>
            <p className="text-sm text-gray-500 mb-4">
              Las clases semanales fijas son:
            </p>
            <div className="text-left max-w-md mx-auto space-y-2 text-sm">
              <div><strong>Lunes:</strong> 17:30</div>
              <div><strong>Martes:</strong> 10:00, 17:30, 19:00</div>
              <div><strong>Jueves:</strong> 10:00, 16:00, 17:30, 19:00</div>
              <div><strong>Sábado:</strong> 09:30, 11:00</div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClases.map((clase) => (
                  <tr key={clase.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getDiaNombre(clase.dia)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{clase.hora}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{clase.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDelete(clase.id)}
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
        )}
      </div>
    </div>
  );
}
