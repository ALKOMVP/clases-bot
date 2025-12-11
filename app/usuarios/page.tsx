'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import TableScrollContainer from '@/components/TableScrollContainer';
import { handleApiError, fetchWithErrorHandling } from '@/lib/frontend-error-handler';

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  fecha_alta: string;
  activo: boolean;
}

interface Clase {
  id: number;
  dia: string;
  hora: string;
  nombre: string;
}

interface Reserva {
  usuario_id: number;
  clase_id: number;
  dia: string;
  hora: string;
  clase_nombre: string;
}

export default function UsuariosPage() {
  const searchParams = useSearchParams();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showClasesModal, setShowClasesModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // 12 items por página
  const [filterStatus, setFilterStatus] = useState<'all' | 'activos' | 'desactivados'>('all');
  const [formData, setFormData] = useState<{
    id: number;
    nombre: string;
    apellido: string;
    telefono: string;
    fecha_alta: string;
  }>({
    id: 0,
    nombre: '',
    apellido: '',
    telefono: '',
    fecha_alta: new Date().toISOString().split('T')[0],
  });

  // Leer parámetro de filtro de la URL
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'desactivados' || filter === 'activos' || filter === 'all') {
      setFilterStatus(filter);
    }
  }, [searchParams]);

  useEffect(() => {
    const initData = async () => {
      await loadClases();
      await loadReservas();
      const usuariosData = await loadUsuarios();
      
      // Si no hay usuarios, generar automáticamente 50 alumnos de prueba
      if (Array.isArray(usuariosData) && usuariosData.length === 0) {
        try {
          const res = await fetch('/api/test-users', { method: 'POST' });
          const data = await res.json();
          if (res.ok) {
            console.log('Usuarios de prueba generados automáticamente:', data.message);
            await loadUsuarios();
          } else {
            console.error('Error generando usuarios de prueba:', data.error);
          }
        } catch (error: any) {
          console.error('Error generando usuarios de prueba:', error);
        }
      }
    };
    initData();
  }, []);

  const loadUsuarios = async () => {
    try {
      const res = await fetchWithErrorHandling('/api/usuarios', {}, {
        route: '/api/usuarios',
        operation: 'load_usuarios'
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsuarios(data);
        return data;
      } else {
        console.warn('loadUsuarios: Response is not an array', data);
        setUsuarios([]);
        return [];
      }
    } catch (error: any) {
      console.error('Error loading usuarios:', error);
      alert(error.message || 'Error al cargar usuarios');
      setUsuarios([]);
      return [];
    }
  };

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
        console.warn('loadClases: Response is not an array', data);
        setClases([]);
      }
    } catch (error: any) {
      console.error('Error loading clases:', error);
      alert(error.message || 'Error al cargar clases');
      setClases([]);
    }
  };

  const loadReservas = async () => {
    try {
      const res = await fetch('/api/reservas');
      if (!res.ok) {
        // Si hay error, solo loguear pero no mostrar alert (puede ser que simplemente no hay reservas)
        console.warn('Error loading reservas:', res.status, res.statusText);
        setReservas([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setReservas(data);
      } else {
        console.warn('loadReservas: Response is not an array', data);
        setReservas([]);
      }
    } catch (error: any) {
      // Solo loguear errores, no mostrar alert (puede ser problema de red temporal)
      console.error('Error loading reservas:', error);
      setReservas([]);
    }
  };

  const getClasesUsuario = (usuarioId: number) => {
    return reservas.filter(r => r.usuario_id === usuarioId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = '/api/usuarios';
    const method = editing ? 'PUT' : 'POST';
    
    // Preparar datos para enviar (activo siempre true al crear/editar, se maneja con botón separado)
    const dataToSend = editing 
      ? { ...formData, activo: true }  // PUT: incluir id y activo true
      : { nombre: formData.nombre, apellido: formData.apellido, telefono: formData.telefono, fecha_alta: formData.fecha_alta, activo: true }; // POST: activo siempre true
    
    try {
      const res = await fetchWithErrorHandling(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      }, {
        route: '/api/usuarios',
        operation: editing ? 'update_usuario' : 'create_usuario'
      });

      setShowForm(false);
      setEditing(null);
      setFormData({
        id: 0,
        nombre: '',
        apellido: '',
        telefono: '',
        fecha_alta: new Date().toISOString().split('T')[0],
      });
      loadUsuarios();
    } catch (error: any) {
      alert(error.message || 'Error al guardar');
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setEditing(usuario);
    setFormData({
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      telefono: usuario.telefono,
      fecha_alta: usuario.fecha_alta,
    });
    setShowForm(true);
  };

  const handleToggleActivo = async (usuario: Usuario) => {
    const nuevoEstado = !usuario.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Estás seguro de ${accion} a ${usuario.nombre} ${usuario.apellido}?${!nuevoEstado ? '\n\nSe eliminarán todas las clases asignadas a este alumno.' : ''}`)) {
      return;
    }

    try {
      // Si se está desactivando, borrar todas las reservas primero
      if (!nuevoEstado) {
        const reservasUsuario = reservas.filter(r => r.usuario_id === usuario.id);
        for (const reserva of reservasUsuario) {
          try {
            await fetch(`/api/reservas?usuario_id=${usuario.id}&clase_id=${reserva.clase_id}`, {
              method: 'DELETE'
            });
          } catch (error) {
            console.error(`Error eliminando reserva ${reserva.clase_id}:`, error);
          }
        }
        // Recargar reservas después de borrarlas
        await loadReservas();
      }

      // Actualizar el estado activo del usuario
      await fetchWithErrorHandling('/api/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: usuario.id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          telefono: usuario.telefono,
          fecha_alta: usuario.fecha_alta,
          activo: nuevoEstado
        })
      }, {
        route: '/api/usuarios',
        operation: 'toggle_activo'
      });

      loadUsuarios();
      loadReservas();
    } catch (error: any) {
      alert(error.message || `Error al ${accion} alumno`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este alumno?')) return;

    try {
      await fetchWithErrorHandling(`/api/usuarios?id=${id}`, { method: 'DELETE' }, {
        route: '/api/usuarios',
        operation: 'delete_usuario'
      });
      loadUsuarios();
      loadReservas();
    } catch (error: any) {
      alert(error.message || 'Error al eliminar');
    }
  };

  const handleManageClases = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setShowClasesModal(true);
  };

  const toggleClase = async (claseId: number) => {
    if (!selectedUsuario) return;

    const reserva = reservas.find(r => r.usuario_id === selectedUsuario.id && r.clase_id === claseId);
    
    try {
      if (reserva) {
        // Desinscribir
        await fetchWithErrorHandling(`/api/reservas?usuario_id=${selectedUsuario.id}&clase_id=${claseId}`, {
          method: 'DELETE'
        }, {
          route: '/api/reservas',
          operation: 'delete_reserva'
        });
        loadReservas();
      } else {
        // Inscribir
        try {
          const res = await fetch('/api/reservas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: selectedUsuario.id, clase_id: claseId })
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            // Mostrar popup específico para cupo completo o ya inscrito
            if (data.code === 'CUPO_COMPLETO') {
              alert(`⚠️ Cupo Completo\n\n${data.error}\n\nCupo máximo: ${data.cupoMaximo} alumnos\nAlumnos inscritos: ${data.cupoActual}`);
            } else if (data.code === 'ALREADY_ENROLLED') {
              alert(`ℹ️ ${data.error}`);
            } else {
              alert(data.error || 'Error al inscribir alumno');
            }
            return;
          }
          
          loadReservas();
        } catch (error: any) {
          // Solo mostrar error en consola si es un error inesperado
          console.error('Error inesperado al inscribir:', error);
          alert(error.message || 'Error al inscribir alumno');
        }
      }
    } catch (error: any) {
      alert(error.message || 'Error al modificar reserva');
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

  const getClasesInscritas = (usuarioId: number) => {
    return getClasesUsuario(usuarioId).map(r => {
      const clase = clases.find(c => c.id === r.clase_id);
      return clase ? `${getDiaNombre(clase.dia)} ${clase.hora}` : '';
    }).filter(Boolean).join(', ') || 'Ninguna';
  };

  // Filtrar usuarios según el término de búsqueda y estado (aplicar filtros a TODOS los items)
  const filteredUsuarios = usuarios.filter(usuario => {
    // Filtro por estado
    if (filterStatus === 'activos' && !usuario.activo) return false;
    if (filterStatus === 'desactivados' && usuario.activo) return false;
    
    // Filtro por búsqueda
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      usuario.nombre.toLowerCase().includes(search) ||
      usuario.apellido.toLowerCase().includes(search) ||
      (usuario.telefono || '').toLowerCase().includes(search) ||
      getClasesInscritas(usuario.id).toLowerCase().includes(search)
    );
  });

  // Calcular paginación DESPUÉS de aplicar filtros
  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsuarios = filteredUsuarios.slice(startIndex, endIndex);

  // Resetear a página 1 cuando cambia el término de búsqueda o el filtro de estado
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Alumnos</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setShowForm(true);
                setEditing(null);
                setFormData({
                  id: 0,
                  nombre: '',
                  apellido: '',
                  telefono: '',
                  fecha_alta: new Date().toISOString().split('T')[0],
                });
              }}
              className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              + Nuevo Alumno
            </button>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, teléfono o clases..."
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
          {/* Filtros rápidos */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('activos')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'activos'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setFilterStatus('desactivados')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'desactivados'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Desactivados
            </button>
          </div>
          {(searchTerm || filterStatus !== 'all') && (
            <p className="text-sm text-gray-600">
              Mostrando {filteredUsuarios.length} de {usuarios.length} alumnos
            </p>
          )}
        </div>

        {showForm && (
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-900">
              {editing ? 'Editar Alumno' : 'Nuevo Alumno'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500"
                    required
                    placeholder="Ej: +54 11 1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Alta
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_alta}
                    onChange={(e) => setFormData({ ...formData, fecha_alta: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm sm:text-base w-full sm:w-auto"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 text-sm sm:text-base w-full sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <TableScrollContainer className="mx-0">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Apellido</th>
                <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Teléfono</th>
                <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Clases Inscritas</th>
                <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsuarios.map((usuario) => {
                const clasesInscritas = getClasesInscritas(usuario.id);
                return (
                  <tr key={usuario.id} className={!usuario.activo ? 'opacity-60' : ''}>
                    <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-sm text-gray-900">{usuario.nombre}</td>
                    <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-sm text-gray-900">{usuario.apellido}</td>
                    <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">{usuario.telefono || '-'}</td>
                    <td className="px-4 sm:px-6 py-2 text-sm text-gray-900 hidden lg:table-cell">
                      <div className="max-w-xs truncate" title={clasesInscritas}>
                        {clasesInscritas}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        usuario.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {usuario.activo ? 'Activo' : 'Desactivado'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                        <button
                          onClick={() => handleManageClases(usuario)}
                          disabled={!usuario.activo}
                          className={`px-3 py-2 sm:px-0 sm:py-0 rounded-md sm:rounded-none text-sm font-medium transition-colors sm:mr-3 ${
                            usuario.activo
                              ? 'bg-blue-50 sm:bg-transparent text-blue-600 hover:text-blue-900 hover:bg-blue-100 sm:hover:bg-transparent'
                              : 'bg-gray-100 sm:bg-transparent text-gray-400 cursor-not-allowed opacity-50'
                          }`}
                          title={usuario.activo ? 'Ver y gestionar reservas de clases' : 'No disponible para alumnos desactivados'}
                        >
                          Reservas
                        </button>
                        <button
                          onClick={() => handleEdit(usuario)}
                          disabled={!usuario.activo}
                          className={`px-3 py-2 sm:px-0 sm:py-0 rounded-md sm:rounded-none text-sm font-medium transition-colors sm:mr-3 ${
                            usuario.activo
                              ? 'bg-purple-50 sm:bg-transparent text-purple-600 hover:text-purple-900 hover:bg-purple-100 sm:hover:bg-transparent'
                              : 'bg-gray-100 sm:bg-transparent text-gray-400 cursor-not-allowed opacity-50'
                          }`}
                          title={usuario.activo ? 'Editar alumno' : 'No disponible para alumnos desactivados'}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(usuario.id)}
                          disabled={!usuario.activo}
                          className={`px-3 py-2 sm:px-0 sm:py-0 rounded-md sm:rounded-none text-sm font-medium transition-colors sm:mr-3 ${
                            usuario.activo
                              ? 'bg-red-50 sm:bg-transparent text-red-600 hover:text-red-900 hover:bg-red-100 sm:hover:bg-transparent'
                              : 'bg-gray-100 sm:bg-transparent text-gray-400 cursor-not-allowed opacity-50'
                          }`}
                          title={usuario.activo ? 'Eliminar alumno' : 'No disponible para alumnos desactivados'}
                        >
                          Eliminar
                        </button>
                        <button
                          onClick={() => handleToggleActivo(usuario)}
                          className={`px-3 py-2 sm:px-0 sm:py-0 rounded-md sm:rounded-none text-sm font-medium transition-colors ${
                            usuario.activo
                              ? 'bg-orange-50 sm:bg-transparent text-orange-600 hover:text-orange-900 hover:bg-orange-100 sm:hover:bg-transparent'
                              : 'bg-green-50 sm:bg-transparent text-green-600 hover:text-green-900 hover:bg-green-100 sm:hover:bg-transparent'
                          }`}
                          title={usuario.activo ? 'Desactivar alumno' : 'Activar alumno'}
                          style={{ opacity: 1 }}
                        >
                          {usuario.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </TableScrollContainer>
          </div>

          {/* Controles de paginación */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredUsuarios.length)} de {filteredUsuarios.length} alumnos
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

        {showClasesModal && selectedUsuario && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => {
            setShowClasesModal(false);
            setSelectedUsuario(null);
          }}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 sm:p-6 flex-shrink-0 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold pr-2">
                    Reservas de {selectedUsuario.nombre} {selectedUsuario.apellido}
                  </h2>
                  <button
                    onClick={() => {
                      setShowClasesModal(false);
                      setSelectedUsuario(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-4 sm:p-6">
                <div className="space-y-2">
                  {clases.map((clase) => {
                    const inscrito = reservas.some(
                      r => r.usuario_id === selectedUsuario.id && r.clase_id === clase.id
                    );
                    return (
                      <div
                        key={clase.id}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-3 rounded-lg border-2 ${
                          inscrito
                            ? 'bg-green-50 border-green-300'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{getDiaNombre(clase.dia)}</span>
                          <span className="ml-2 text-gray-600">{clase.hora}</span>
                          <span className="ml-2 text-sm text-gray-500">- {clase.nombre}</span>
                        </div>
                        <button
                          onClick={() => toggleClase(clase.id)}
                          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap ${
                            inscrito
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {inscrito ? 'Desinscribir' : 'Inscribir'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 sm:p-6 flex-shrink-0 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowClasesModal(false);
                    setSelectedUsuario(null);
                  }}
                  className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium text-base"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
