'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { fetchWithErrorHandling } from '@/lib/frontend-error-handler';

interface Reserva {
  usuario_id: number;
  clase_id: number;
  dia: string;
  hora: string;
  created_at: string;
  nombre?: string;
  apellido?: string;
  clase_nombre?: string;
}

interface Clase {
  id: number;
  dia: string;
  hora: string;
  nombre: string;
}

interface CalendarItem {
  fecha: Date;
  diaSemana: string;
  semana: number;
  clases: Array<{ clase: Clase; fecha: Date; reservas: Reserva[] }>;
}

export default function CalendarioPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [selectedClase, setSelectedClase] = useState<{ clase: Clase; fecha: Date } | null>(null);
  const [showAlumnosModal, setShowAlumnosModal] = useState(false);
  const [generatingReservas, setGeneratingReservas] = useState(false);
  const [searchAlumno, setSearchAlumno] = useState('');

  const loadReservas = async () => {
    try {
      const res = await fetchWithErrorHandling('/api/reservas', {}, {
        route: '/api/reservas',
        operation: 'load_reservas'
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setReservas(data);
        return data;
      } else {
        setReservas([]);
        return [];
      }
    } catch (error: any) {
      console.error('Error loading reservas:', error);
      setReservas([]);
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
        return data;
      } else {
        setClases([]);
        return [];
      }
    } catch (error: any) {
      console.error('Error loading clases:', error);
      setClases([]);
      return [];
    }
  };

  const handleGenerateRandomReservas = async (silent = false) => {
    if (!silent && !confirm('¿Generar reservas aleatorias para varios alumnos? Esto creará reservas aleatorias.')) return;
    
    setGeneratingReservas(true);
    try {
      const res = await fetchWithErrorHandling('/api/reservas/generate-random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, {
        route: '/api/reservas/generate-random',
        operation: 'generate_random_reservas'
      });
      
      const data = await res.json();
      if (res.ok) {
        if (!silent) {
          alert(data.message || 'Reservas generadas correctamente');
        }
        await loadReservas();
      } else {
        if (!silent) {
          alert(data.error || 'Error al generar reservas');
        }
      }
    } catch (error: any) {
      if (!silent) {
        alert(error.message || 'Error al generar reservas');
      }
    } finally {
      setGeneratingReservas(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      const clasesData = await loadClases();
      const reservasData = await loadReservas();
      
      // Si no hay reservas y hay clases disponibles, generar algunas automáticamente
      if (Array.isArray(reservasData) && reservasData.length === 0 && Array.isArray(clasesData) && clasesData.length > 0) {
        // Verificar que haya usuarios activos antes de generar
        try {
          const usuariosRes = await fetchWithErrorHandling('/api/usuarios', {}, {
            route: '/api/usuarios',
            operation: 'load_usuarios'
          });
          const usuarios = await usuariosRes.json();
          if (Array.isArray(usuarios) && usuarios.filter((u: any) => u.activo).length > 0) {
            await handleGenerateRandomReservas(true);
          }
        } catch (error) {
          // Silenciar error, solo es para inicialización
          console.error('Error al verificar usuarios:', error);
        }
      }
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDiaNombre = (dia: string) => {
    const dias: { [key: string]: string } = {
      'Lun': 'Lunes',
      'Mar': 'Martes',
      'Jue': 'Jueves',
      'Sab': 'Sábado'
    };
    return dias[dia] || dia;
  };

  // Generar calendario de 30 días exactos desde hoy
  const generateCalendar = (): CalendarItem[] => {
    if (!clases || clases.length === 0) {
      return [];
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar a medianoche
    const calendar: CalendarItem[] = [];

    // 30 días exactos desde hoy (incluyendo hoy)
    // i=0 es hoy, i=30 es el día 31 desde hoy
    // Si hoy es jueves 11 dic, el día 30 es sábado 10 ene (29 días después)
    // Para incluir exactamente 30 días desde hoy, necesitamos i <= 30 (31 días totales)
    // Pero si queremos "30 días adelante", sería hasta el día 30 inclusive
    // Calculamos: si hoy es jueves 11 dic, el sábado 10 ene es el día 30 (29 días después)
    // Entonces necesitamos incluir hasta i=30 para capturar el sábado 10 ene
    for (let i = 0; i <= 30; i++) {
      const fecha = new Date(today);
      fecha.setDate(today.getDate() + i);
      
      const diaSemana = fecha.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      const diaMap: { [key: number]: string } = { 1: 'Lun', 2: 'Mar', 4: 'Jue', 6: 'Sab' };
      const diaClase = diaMap[diaSemana];
      
      if (diaClase) {
        const clasesDelDia = clases
          .filter(c => c && c.dia === diaClase)
          .map(c => {
            // Obtener reservas para esta clase específica
            const reservasClase = (reservas || []).filter(r => r && r.clase_id === c.id);
            return { 
              clase: c, 
              fecha: new Date(fecha),
              reservas: reservasClase
            };
          });
        
        if (clasesDelDia.length > 0) {
          // Calcular semana del año (ISO 8601)
          const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
          const dayNum = d.getUTCDay() || 7;
          d.setUTCDate(d.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          const semana = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
          
          calendar.push({
            fecha: new Date(fecha),
            diaSemana: getDiaNombre(diaClase),
            semana,
            clases: clasesDelDia,
          });
        }
      }
    }
    
    return calendar;
  };

  const calendarData = generateCalendar();

  const handleClaseClick = (clase: Clase, fecha: Date) => {
    setSelectedClase({ clase, fecha });
    setShowAlumnosModal(true);
  };

  const getAlumnosInscritos = (claseId: number) => {
    return reservas.filter(r => r.clase_id === claseId);
  };

  const getAlumnosFiltrados = (claseId: number) => {
    const alumnos = getAlumnosInscritos(claseId);
    if (!searchAlumno.trim()) {
      return alumnos;
    }
    const search = searchAlumno.toLowerCase();
    return alumnos.filter(alumno => 
      (alumno.nombre || '').toLowerCase().includes(search) ||
      (alumno.apellido || '').toLowerCase().includes(search) ||
      `${alumno.apellido}, ${alumno.nombre}`.toLowerCase().includes(search)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Calendario</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
              Próximos 30 días - Haz click en una clase para ver los alumnos inscritos
            </p>
          </div>
        </div>

        {calendarData.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">No hay clases disponibles.</p>
            <p className="text-sm text-gray-500">
              Por favor, inicializa las clases desde la sección "Clases".
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="space-y-6">
                {calendarData.map((item, idx) => (
                  <div key={idx} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-semibold text-gray-900 text-lg">
                        {item.fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Semana {item.semana}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {item.clases.map((c, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => handleClaseClick(c.clase, c.fecha)}
                          className="bg-gray-50 hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-300 p-4 rounded-lg transition-all text-left cursor-pointer"
                        >
                          <div className="font-medium text-gray-900 mb-1">{c.clase.nombre}</div>
                          <div className="text-sm text-gray-600 mb-2">{c.clase.hora}</div>
                          <div className="text-xs text-gray-500">
                            {c.reservas.length} {c.reservas.length === 1 ? 'alumno inscrito' : 'alumnos inscritos'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal de alumnos inscritos */}
        {showAlumnosModal && selectedClase && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => {
            setShowAlumnosModal(false);
            setSelectedClase(null);
          }}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 sm:p-6 flex-shrink-0 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold pr-2">
                      {selectedClase.clase.nombre} - {selectedClase.fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">{selectedClase.clase.hora}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowAlumnosModal(false);
                      setSelectedClase(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-4 sm:p-6">
                {getAlumnosInscritos(selectedClase.clase.id).length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No hay alumnos inscritos en esta clase.</p>
                ) : (
                  <>
                    {/* Buscador de alumnos */}
                    <div className="mb-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Buscar alumno por nombre..."
                          value={searchAlumno}
                          onChange={(e) => setSearchAlumno(e.target.value)}
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
                        {searchAlumno && (
                          <button
                            onClick={() => setSearchAlumno('')}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {searchAlumno && (
                        <p className="mt-2 text-sm text-gray-600">
                          Mostrando {getAlumnosFiltrados(selectedClase.clase.id).length} de {getAlumnosInscritos(selectedClase.clase.id).length} alumnos
                        </p>
                      )}
                    </div>
                    {getAlumnosFiltrados(selectedClase.clase.id).length === 0 ? (
                      <p className="text-gray-600 text-center py-8">No se encontraron alumnos que coincidan con la búsqueda.</p>
                    ) : (
                      <div className="space-y-1">
                        {getAlumnosFiltrados(selectedClase.clase.id).map((reserva, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-900">
                                {reserva.apellido}, {reserva.nombre}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="p-4 sm:p-6 flex-shrink-0 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowAlumnosModal(false);
                      setSelectedClase(null);
                      setSearchAlumno('');
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
