'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import TableScrollContainer from '@/components/TableScrollContainer';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // 12 items por página
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

  // Filtrar clases según el término de búsqueda (aplicar filtros a TODOS los items)
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

  // Calcular paginación DESPUÉS de aplicar filtros
  const totalPages = Math.ceil(filteredClases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClases = filteredClases.slice(startIndex, endIndex);

  // Resetear a página 1 cuando cambia el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Clases Semanales</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Horarios fijos que se repiten todas las semanas</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {clases.length === 0 && (
              <button
                onClick={handleInitialize}
                disabled={loading}
                className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm sm:text-base flex-1 sm:flex-none"
              >
                {loading ? 'Inicializando...' : 'Inicializar Clases'}
              </button>
            )}
            <button
              onClick={() => {
                setShowForm(true);
                setFormData({ dia: 'Lun', hora: '', nombre: 'Yoga' });
              }}
              className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base flex-1 sm:flex-none"
            >
              + Nueva Clase
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-900">Nueva Clase</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Día *
                  </label>
                  <select
                    value={formData.dia}
                    onChange={(e) => setFormData({ ...formData, dia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ dia: 'Lun', hora: '', nombre: 'Yoga' });
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 text-sm sm:text-base w-full sm:w-auto"
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
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
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
              <div><strong>Lunes:</strong> 17:30, 19:00</div>
              <div><strong>Martes:</strong> 10:00, 17:30, 19:00</div>
              <div><strong>Jueves:</strong> 10:00, 16:00, 17:30, 19:00</div>
              <div><strong>Sábado:</strong> 09:30, 11:00</div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <TableScrollContainer className="mx-0">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                    <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                    <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedClases.map((clase) => (
                    <tr key={clase.id}>
                      <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getDiaNombre(clase.dia)}
                      </td>
                      <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-sm text-gray-900">{clase.hora}</td>
                      <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-sm text-gray-900">{clase.nombre}</td>
                      <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDelete(clase.id)}
                          className="px-3 py-2 sm:px-0 sm:py-0 rounded-md sm:rounded-none bg-red-50 sm:bg-transparent text-red-600 hover:text-red-900 hover:bg-red-100 sm:hover:bg-transparent text-sm font-medium transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </TableScrollContainer>
            </div>

            {/* Controles de paginación */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 rounded-lg shadow-md">
                <div className="text-sm text-gray-700">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredClases.length)} de {filteredClases.length} clases
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg ${
                            currentPage === pageNum
                              ? 'bg-purple-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
