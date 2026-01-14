'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import TableScrollContainer from '@/components/TableScrollContainer';
import { fetchWithErrorHandling } from '@/lib/frontend-error-handler';

interface Cancelacion {
  usuario_id: number;
  clase_id: number;
  fecha_clase: string;
  usuario_nombre?: string;
  usuario_apellido?: string;
  clase_dia?: string;
  clase_hora?: string;
  clase_nombre?: string;
  created_at?: string;
  es_temporal?: number | boolean;
}

export default function CancelacionesPage() {
  const [cancelaciones, setCancelaciones] = useState<Cancelacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [undoingKey, setUndoingKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('todas'); // 'todas', 'fija', 'temporal'
  const [showDebugButtons, setShowDebugButtons] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // 12 items por página

  // Ctrl+D para mostrar botones de debug
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setShowDebugButtons(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    loadCancelaciones();
  }, [tipoFiltro]);

  const loadCancelaciones = async () => {
    setLoading(true);
    try {
      const url = tipoFiltro === 'todas' 
        ? '/api/cancelaciones' 
        : `/api/cancelaciones?tipo=${tipoFiltro}`;
      
      const res = await fetchWithErrorHandling(url, {}, {
        route: '/api/cancelaciones',
        operation: 'load_cancelaciones'
      });
      const data = await res.json();
      Array.isArray(data) ? setCancelaciones(data) : setCancelaciones([]);
    } catch (error) {
      console.error('Error loading cancelaciones:', error);
      setCancelaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('¿Estás seguro de que deseas anular TODAS las cancelaciones?\n\nEsta acción no se puede deshacer y los alumnos afectados volverán a aparecer en sus clases fijas.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetchWithErrorHandling('/api/cancelaciones', {
        method: 'DELETE'
      }, {
        route: '/api/cancelaciones',
        operation: 'delete_all_cancelaciones'
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Se anularon ${data.deleted || cancelaciones.length} cancelaciones exitosamente.`);
        loadCancelaciones();
      } else {
        alert(data.error || 'Error al anular cancelaciones');
      }
    } catch (error: any) {
      alert(error.message || 'Error al anular cancelaciones');
    } finally {
      setDeleting(false);
    }
  };

  const handleUndoCancelacion = async (c: Cancelacion) => {
    const key = `${c.usuario_id}-${c.clase_id}-${c.fecha_clase}`;

    if (!confirm(`¿Anular esta cancelación?\n\n${c.usuario_apellido || 'N/A'}, ${c.usuario_nombre || 'N/A'}\n${formatFechaClase(c.fecha_clase)}`)) {
      return;
    }

    setUndoingKey(key);
    try {
      const qs = new URLSearchParams({
        usuario_id: String(c.usuario_id),
        clase_id: String(c.clase_id),
        fecha_clase: String(c.fecha_clase),
      });

      const res = await fetchWithErrorHandling(`/api/cancelaciones?${qs.toString()}`, {
        method: 'DELETE',
      }, {
        route: '/api/cancelaciones',
        operation: 'undo_cancelacion_single'
      });

      const data = await res.json();

      if (res.ok) {
        // Si es cancelación temporal, la reserva temporal fue recreada en el backend
        // Recargar la lista de cancelaciones para reflejar el cambio
        await loadCancelaciones();
        
        // Mostrar mensaje de éxito
        if (c.es_temporal === 1 || c.es_temporal === true) {
          alert(`✅ Cancelación temporal anulada. La reserva temporal ha sido recreada automáticamente.`);
        } else {
          alert(`✅ Cancelación anulada exitosamente.`);
        }
      } else {
        alert(data?.error || 'Error al anular la cancelación');
      }
    } catch (error: any) {
      alert(error?.message || 'Error al anular la cancelación');
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

  const formatCreatedAt = (createdAt: string | undefined) => {
    if (!createdAt) return '-';
    try {
      // SQLite datetime('now') devuelve UTC sin indicador de zona horaria
      // Agregamos 'Z' para indicar que es UTC, o si ya tiene zona horaria, lo usamos tal cual
      let dateStr = createdAt.trim();
      // Si no termina en Z ni tiene + o - (indicador de zona horaria), asumimos UTC
      if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        // Si tiene formato "YYYY-MM-DD HH:MM:SS", agregamos 'Z' para indicar UTC
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
          dateStr = dateStr + 'Z';
        }
      }
      const date = new Date(dateStr);
      // Convertir a hora local de Argentina (UTC-3)
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

  const filteredCancelaciones = cancelaciones.filter(cancelacion => {
    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase().trim();
    const nombre = (cancelacion.usuario_nombre || '').toLowerCase();
    const apellido = (cancelacion.usuario_apellido || '').toLowerCase();
    const nombreCompleto = `${apellido}, ${nombre}`;
    const diaNombre = cancelacion.clase_dia ? getDiaNombre(cancelacion.clase_dia) : '';
    const hora = (cancelacion.clase_hora || '').toLowerCase();
    const claseNombre = (cancelacion.clase_nombre || '').toLowerCase();
    const fechaClaseFormateada = formatFechaClase(cancelacion.fecha_clase).toLowerCase();
    const createdAtFormateado = formatCreatedAt(cancelacion.created_at).toLowerCase();
    const fechaClase = cancelacion.fecha_clase.toLowerCase();

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

  // Calcular paginación DESPUÉS de aplicar filtros
  const totalPages = Math.ceil(filteredCancelaciones.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCancelaciones = filteredCancelaciones.slice(startIndex, endIndex);

  // Resetear a página 1 cuando cambia el término de búsqueda o el filtro de tipo
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, tipoFiltro]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Cancelaciones</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
              Lista de todas las cancelaciones (fijas y temporales) por fecha específica
            </p>
          </div>
          {cancelaciones.length > 0 && showDebugButtons && (
            <button
              onClick={handleDeleteAll}
              disabled={deleting}
              className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
            >
              {deleting ? 'Anulando...' : `Anular Todas (${cancelaciones.length})`}
            </button>
          )}
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
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base bg-white"
            >
              <option value="todas">Todas las cancelaciones</option>
              <option value="fija">Solo cancelaciones fijas</option>
              <option value="temporal">Solo cancelaciones temporales</option>
            </select>
          </div>
          {cancelaciones.length > 0 && (
            <p className="text-sm text-gray-600">
              Total de cancelaciones: {cancelaciones.length}
              {searchTerm && ` (${filteredCancelaciones.length} filtradas)`}
            </p>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">Cargando cancelaciones...</p>
          </div>
        ) : cancelaciones.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-2">No hay cancelaciones registradas.</p>
            <p className="text-sm text-gray-500">
              Las cancelaciones aparecerán aquí cuando un alumno (fijo o temporal) cancele una clase para una fecha específica.
            </p>
          </div>
        ) : filteredCancelaciones.length === 0 && searchTerm ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-2">
              No se encontraron cancelaciones que coincidan con "{searchTerm}".
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
                    Mostrando <span className="font-semibold text-gray-900">{filteredCancelaciones.length}</span> de{' '}
                    <span className="font-semibold text-gray-900">{cancelaciones.length}</span> cancelaciones
                  </>
                ) : (
                  <>
                    Total de cancelaciones: <span className="font-semibold text-gray-900">{cancelaciones.length}</span>
                  </>
                )}
              </p>
            </div>
            <TableScrollContainer className="mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alumno
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Clase
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Cancelada
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Fecha de Cancelación
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedCancelaciones.map((cancelacion, index) => (
                    <tr key={`${cancelacion.usuario_id}-${cancelacion.clase_id}-${cancelacion.fecha_clase}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {cancelacion.usuario_apellido || 'N/A'}, {cancelacion.usuario_nombre || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm text-gray-900">
                          {cancelacion.clase_dia ? getDiaNombre(cancelacion.clase_dia) : 'N/A'} {cancelacion.clase_hora || ''}
                        </div>
                        {cancelacion.clase_nombre && (
                          <div className="text-xs text-gray-500">
                            {cancelacion.clase_nombre}
                          </div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatFechaClase(cancelacion.fecha_clase)}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {formatCreatedAt(cancelacion.created_at)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {cancelacion.es_temporal === 1 || cancelacion.es_temporal === true ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Cancelación Temporal
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                            Cancelación Fija
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleUndoCancelacion(cancelacion)}
                          disabled={undoingKey === `${cancelacion.usuario_id}-${cancelacion.clase_id}-${cancelacion.fecha_clase}`}
                          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                          title="Anular cancelación"
                        >
                          {undoingKey === `${cancelacion.usuario_id}-${cancelacion.clase_id}-${cancelacion.fecha_clase}` ? 'Anulando...' : 'Anular'}
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
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredCancelaciones.length)} de {filteredCancelaciones.length} cancelaciones
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
