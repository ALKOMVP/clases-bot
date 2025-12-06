'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  fecha_alta: string;
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
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showClasesModal, setShowClasesModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    id: 0,
    nombre: '',
    apellido: '',
    email: '',
    fecha_alta: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadUsuarios();
    loadClases();
    loadReservas();
  }, []);

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

  const getClasesUsuario = (usuarioId: number) => {
    return reservas.filter(r => r.usuario_id === usuarioId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = '/api/usuarios';
    const method = editing ? 'PUT' : 'POST';
    
    // Preparar datos para enviar
    const dataToSend = editing 
      ? formData  // PUT: incluir id
      : { nombre: formData.nombre, apellido: formData.apellido, email: formData.email, fecha_alta: formData.fecha_alta }; // POST: sin id
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend),
    });

    if (res.ok) {
      setShowForm(false);
      setEditing(null);
      setFormData({
        id: 0,
        nombre: '',
        apellido: '',
        email: '',
        fecha_alta: new Date().toISOString().split('T')[0],
      });
      loadUsuarios();
    } else {
      const error = await res.json();
      alert(error.error || 'Error al guardar');
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setEditing(usuario);
    setFormData(usuario);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este alumno?')) return;

    try {
      const res = await fetch(`/api/usuarios?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadUsuarios();
        loadReservas();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting usuario:', error);
      alert('Error al eliminar');
    }
  };

  const handleManageClases = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setShowClasesModal(true);
  };

  const toggleClase = async (claseId: number) => {
    if (!selectedUsuario) return;

    const reserva = reservas.find(r => r.usuario_id === selectedUsuario.id && r.clase_id === claseId);
    
    if (reserva) {
      // Desinscribir
      const res = await fetch(`/api/reservas?usuario_id=${selectedUsuario.id}&clase_id=${claseId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadReservas();
      } else {
        alert('Error al desinscribir');
      }
    } else {
      // Inscribir
      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: selectedUsuario.id, clase_id: claseId })
      });
      if (res.ok) {
        loadReservas();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al inscribir');
      }
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

  // Filtrar usuarios según el término de búsqueda
  const filteredUsuarios = usuarios.filter(usuario => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      usuario.nombre.toLowerCase().includes(search) ||
      usuario.apellido.toLowerCase().includes(search) ||
      usuario.email.toLowerCase().includes(search) ||
      getClasesInscritas(usuario.id).toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Alumnos</h1>
          <button
            onClick={() => {
              setShowForm(true);
              setEditing(null);
              setFormData({
                id: 0,
                nombre: '',
                apellido: '',
                email: '',
                fecha_alta: new Date().toISOString().split('T')[0],
              });
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            + Nuevo Alumno
          </button>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, email o clases..."
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
              Mostrando {filteredUsuarios.length} de {usuarios.length} alumnos
            </p>
          )}
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-semibold mb-4">
              {editing ? 'Editar Alumno' : 'Nuevo Alumno'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
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
                    setEditing(null);
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apellido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clases Inscritas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsuarios.map((usuario) => {
                const clasesInscritas = getClasesInscritas(usuario.id);
                return (
                  <tr key={usuario.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.apellido}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={clasesInscritas}>
                        {clasesInscritas}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleManageClases(usuario)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Ver y gestionar reservas de clases"
                      >
                        Reservas
                      </button>
                      <button
                        onClick={() => handleEdit(usuario)}
                        className="text-purple-600 hover:text-purple-900 mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(usuario.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {showClasesModal && selectedUsuario && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold">
                    Reservas de {selectedUsuario.nombre} {selectedUsuario.apellido}
                  </h2>
                  <button
                    onClick={() => {
                      setShowClasesModal(false);
                      setSelectedUsuario(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2">
                  {clases.map((clase) => {
                    const inscrito = reservas.some(
                      r => r.usuario_id === selectedUsuario.id && r.clase_id === clase.id
                    );
                    return (
                      <div
                        key={clase.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                          inscrito
                            ? 'bg-green-50 border-green-300'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div>
                          <span className="font-medium">{getDiaNombre(clase.dia)}</span>
                          <span className="ml-2 text-gray-600">{clase.hora}</span>
                          <span className="ml-2 text-sm text-gray-500">- {clase.nombre}</span>
                        </div>
                        <button
                          onClick={() => toggleClase(clase.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
