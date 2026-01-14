'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import TableScrollContainer from '@/components/TableScrollContainer';
import { fetchWithErrorHandling } from '@/lib/frontend-error-handler';

interface AsignacionTemporal {
  usuario_id: number;
  clase_id: number;
  fecha_clase: string;
  usuario_nombre?: string;
  usuario_apellido?: string;
  clase_dia?: string;
  clase_hora?: string;
  clase_nombre?: string;
  created_at?: string;
}

export default function AsignacionesTemporalesPage() {
  const [asignaciones, setAsignaciones] = useState<AsignacionTemporal[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoingKey, setUndoingKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // 12 items por página
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadAsignaciones();
  }, []);

  const loadAsignaciones = async () => {
    setLoading(true);
    try {
      const res = await fetchWithErrorHandling('/api/reservas/temporales', {}, {
        route: '/api/reservas/temporales',
        operation: 'load_asignaciones'
      });
      const data = await res.json();
      Array.isArray(data) ? setAsignaciones(data) : setAsignaciones([]);
    } catch (error) {
      console.error('Error loading asignaciones:', error);
      setAsignaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoAsignacion = async (a: AsignacionTemporal) => {
    const key = `${a.usuario_id}-${a.clase_id}-${a.fecha_clase}`;

    if (!confirm(`¿Anular esta asignación temporal?\n\n${a.usuario_apellido || 'N/A'}, ${a.usuario_nombre || 'N/A'}\n${formatFechaClase(a.fecha_clase)}`)) {
      return;
    }

    setUndoingKey(key);
    try {
      const qs = new URLSearchParams({
        usuario_id: String(a.usuario_id),
        clase_id: String(a.clase_id),
        fecha_clase: String(a.fecha_clase),
      });

      const res = await fetchWithErrorHandling(`/api/reservas/temporales?${qs.toString()}`, {
        method: 'DELETE',
      }, {
        route: '/api/reservas/temporales',
        operation: 'undo_asignacion_single'
      });

      const data = await res.json();

      if (res.ok) {
        await loadAsignaciones();
        alert(`✅ Asignación temporal anulada exitosamente.`);
      } else {
        alert(data?.error || 'Error al anular la asignación temporal');
      }
    } catch (error: any) {
      alert(error?.message || 'Error al anular la asignación temporal');
    } finally {
      setUndoingKey(null);
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

  const formatFechaClase = (fecha: string) => {
    if (!fecha) return '-';
    try {
      return new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return fecha;
    }
  };

  const formatFechaClaseConHora = (fecha: string, hora: string) => {
    if (!fecha) return '-';
    try {
      // Parsear la hora (formato esperado: "HH:MM" o "HH:MM:SS")
      let horaFormateada = hora || '';
      if (horaFormateada && !horaFormateada.includes(':')) {
        horaFormateada = '';
      }
      
      // Crear fecha con hora
      const fechaHora = horaFormateada 
        ? new Date(fecha + 'T' + horaFormateada + ':00')
        : new Date(fecha + 'T00:00:00');
      
      return fechaHora.toLocaleString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Argentina/Buenos_Aires'
      });
    } catch (error) {
      return fecha + (hora ? ' ' + hora : '');
    }
  };

  const formatCreatedAt = (createdAt: string | undefined) => {
    if (!createdAt) return '-';
    try {
      let dateStr = createdAt.trim();
      if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
          dateStr = dateStr + 'Z';
        }
      }
      const date = new Date(dateStr);
      return date.toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return createdAt;
    }
  };

  const filteredAsignaciones = asignaciones.filter(asignacion => {
    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase().trim();
    const nombre = (asignacion.usuario_nombre || '').toLowerCase();
    const apellido = (asignacion.usuario_apellido || '').toLowerCase();
    const nombreCompleto = `${apellido}, ${nombre}`;
    const diaNombre = asignacion.clase_dia ? getDiaNombre(asignacion.clase_dia) : '';
    const hora = (asignacion.clase_hora || '').toLowerCase();
    const claseNombre = (asignacion.clase_nombre || '').toLowerCase();
    const fechaClaseFormateada = formatFechaClase(asignacion.fecha_clase).toLowerCase();
    const createdAtFormateado = formatCreatedAt(asignacion.created_at).toLowerCase();
    const fechaClase = asignacion.fecha_clase.toLowerCase();

    return (
      nombre.includes(search) ||
      apellido.includes(search) ||
      nombreCompleto.includes(search) ||
      diaNombre.toLowerCase().includes(search) ||
      hora.includes(search) ||
      claseNombre.includes(search) ||
      fechaClaseFormateada.includes(search) ||
      createdAtFormateado.includes(search) ||
      fechaClase.includes(search)
    );
  });

  // Ordenar asignaciones DESPUÉS de aplicar filtros
  const sortedAsignaciones = [...filteredAsignaciones].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'alumno':
        aValue = `${(a.usuario_apellido || '').toLowerCase()}, ${(a.usuario_nombre || '').toLowerCase()}`;
        bValue = `${(b.usuario_apellido || '').toLowerCase()}, ${(b.usuario_nombre || '').toLowerCase()}`;
        break;
      case 'fecha_clase':
        try {
          const aDate = new Date(a.fecha_clase + 'T' + (a.clase_hora || '00:00') + ':00');
          const bDate = new Date(b.fecha_clase + 'T' + (b.clase_hora || '00:00') + ':00');
          aValue = aDate.getTime();
          bValue = bDate.getTime();
        } catch {
          aValue = new Date(a.fecha_clase + 'T00:00:00').getTime();
          bValue = new Date(b.fecha_clase + 'T00:00:00').getTime();
        }
        break;
      case 'fecha_asignacion':
        try {
          const aDateStr = (a.created_at || '').trim();
          const bDateStr = (b.created_at || '').trim();
          const aDate = new Date(aDateStr.endsWith('Z') || aDateStr.includes('+') || aDateStr.includes('-', 10) ? aDateStr : aDateStr + 'Z');
          const bDate = new Date(bDateStr.endsWith('Z') || bDateStr.includes('+') || bDateStr.includes('-', 10) ? bDateStr : bDateStr + 'Z');
          aValue = aDate.getTime();
          bValue = bDate.getTime();
        } catch {
          aValue = 0;
          bValue = 0;
        }
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Calcular paginación DESPUÉS de aplicar filtros y ordenamiento
  const totalPages = Math.ceil(sortedAsignaciones.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAsignaciones = sortedAsignaciones.slice(startIndex, endIndex);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

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
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Asignaciones Temporales</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
              Lista de todas las asignaciones temporales por fecha específica
            </p>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, clase, fecha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
          {asignaciones.length > 0 && (
            <p className="text-sm text-gray-600">
              Total de asignaciones: {asignaciones.length}
              {searchTerm && ` (${filteredAsignaciones.length} filtradas)`}
            </p>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">Cargando asignaciones temporales...</p>
          </div>
        ) : asignaciones.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-2">No hay asignaciones temporales registradas.</p>
            <p className="text-sm text-gray-500">
              Las asignaciones temporales aparecerán aquí cuando un alumno sea asignado a una clase para una fecha específica.
            </p>
          </div>
        ) : filteredAsignaciones.length === 0 && searchTerm ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-2">
              No se encontraron asignaciones que coincidan con "{searchTerm}".
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                {searchTerm ? (
                  <>
                    Mostrando <span className="font-semibold text-gray-900">{sortedAsignaciones.length}</span> de{' '}
                    <span className="font-semibold text-gray-900">{asignaciones.length}</span> asignaciones
                  </>
                ) : (
                  <>
                    Total de asignaciones: <span className="font-semibold text-gray-900">{asignaciones.length}</span>
                  </>
                )}
              </p>
            </div>
            <TableScrollContainer className="mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('alumno')}
                    >
                      <div className="flex items-center gap-1">
                        Alumno
                        {sortField === 'alumno' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('fecha_clase')}
                    >
                      <div className="flex items-center gap-1">
                        Clase Asignada
                        {sortField === 'fecha_clase' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('fecha_asignacion')}
                    >
                      <div className="flex items-center gap-1">
                        Fecha de Asignación
                        {sortField === 'fecha_asignacion' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedAsignaciones.map((asignacion, index) => (
                    <tr key={`${asignacion.usuario_id}-${asignacion.clase_id}-${asignacion.fecha_clase}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {asignacion.usuario_apellido || 'N/A'}, {asignacion.usuario_nombre || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">
                            {asignacion.clase_dia ? getDiaNombre(asignacion.clase_dia) : 'N/A'} {asignacion.clase_hora || ''}
                          </div>
                          {asignacion.clase_nombre && (
                            <div className="text-xs text-gray-500 mb-1">
                              {asignacion.clase_nombre}
                            </div>
                          )}
                          <div className="text-xs text-gray-600">
                            {formatFechaClaseConHora(asignacion.fecha_clase, asignacion.clase_hora || '')}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {formatCreatedAt(asignacion.created_at)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleUndoAsignacion(asignacion)}
                          disabled={undoingKey === `${asignacion.usuario_id}-${asignacion.clase_id}-${asignacion.fecha_clase}`}
                          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                          title="Anular asignación temporal"
                        >
                          {undoingKey === `${asignacion.usuario_id}-${asignacion.clase_id}-${asignacion.fecha_clase}` ? 'Anulando...' : 'Anular'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScrollContainer>
            {/* Controles de paginación */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, sortedAsignaciones.length)} de {sortedAsignaciones.length} asignaciones
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
          </div>
        )}
      </div>
    </div>
  );
}
