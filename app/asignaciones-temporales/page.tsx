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
                    Mostrando <span className="font-semibold text-gray-900">{filteredAsignaciones.length}</span> de{' '}
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
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alumno
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Clase
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Asignada
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Fecha de Asignación
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAsignaciones.map((asignacion, index) => (
                    <tr key={`${asignacion.usuario_id}-${asignacion.clase_id}-${asignacion.fecha_clase}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {asignacion.usuario_apellido || 'N/A'}, {asignacion.usuario_nombre || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm text-gray-900">
                          {asignacion.clase_dia ? getDiaNombre(asignacion.clase_dia) : 'N/A'} {asignacion.clase_hora || ''}
                        </div>
                        {asignacion.clase_nombre && (
                          <div className="text-xs text-gray-500">
                            {asignacion.clase_nombre}
                          </div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatFechaClase(asignacion.fecha_clase)}
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
          </div>
        )}
      </div>
    </div>
  );
}
