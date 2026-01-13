'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { fetchWithErrorHandling } from '@/lib/frontend-error-handler';

interface Reserva {
  id?: number;
  usuario_id: number;
  clase_id: number;
  dia: string;
  hora: string;
  created_at?: string;
  nombre?: string;
  apellido?: string;
  clase_nombre?: string;
  fecha_clase?: string | null;
  es_reasignacion?: number | boolean;
}

interface Clase {
  id: number;
  dia: string;
  hora: string;
  nombre: string;
}

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  activo: boolean;
}

interface Cancelacion {
  usuario_id: number;
  clase_id: number;
  fecha_clase: string;
}

interface ListaEsperaItem {
  usuario_id: number;
  numero?: number;
  nombre: string;
  apellido: string;
}

interface CalendarItem {
  fecha: Date;
  diaSemana: string;
  semana: number;
  clases: Array<{ clase: Clase; fecha: Date; reservas: Reserva[] }>;
}

export default function CalendarioPage() {
  // Mantener separado: dataset global (cards) vs dataset por-fecha (modal).
  // Si pisamos el global al abrir el modal, las cards “pierden” temporales hasta recargar.
  const [reservasAll, setReservasAll] = useState<Reserva[]>([]);
  const [reservasModal, setReservasModal] = useState<Reserva[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cancelaciones, setCancelaciones] = useState<Cancelacion[]>([]);
  const [selectedClase, setSelectedClase] = useState<{ clase: Clase; fecha: Date } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchAlumnoTemporal, setSearchAlumnoTemporal] = useState('');
  const [listaEspera, setListaEspera] = useState<ListaEsperaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [generatingReservas, setGeneratingReservas] = useState(false);
  const [clearingReservas, setClearingReservas] = useState(false);
  const [showDebugButtons, setShowDebugButtons] = useState(false);
  const [listaEsperaCounts, setListaEsperaCounts] = useState<Map<string, number>>(new Map());
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [needsAutoFix, setNeedsAutoFix] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [hasCheckedAutoFix, setHasCheckedAutoFix] = useState(false);

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

  // Auto-fix de reservas sin fecha_clase (solo cuando se activa explícitamente y no se ha ejecutado antes)
  useEffect(() => {
    if (reservasAll.length > 0 && clases.length > 0 && !loading && needsAutoFix && !isAutoFixing && !hasCheckedAutoFix) {
      const doAutoFix = async () => {
        setIsAutoFixing(true);
        setHasCheckedAutoFix(true);
        try {
          await loadReservasAll();
          await loadListaEsperaCounts();
        } finally {
          setIsAutoFixing(false);
          setNeedsAutoFix(false);
        }
      };
      doAutoFix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAutoFix, loading]);

  // Detectar reservas sin fecha_clase solo una vez después de la carga inicial
  useEffect(() => {
    if (!loading && !hasCheckedAutoFix && reservasAll.length > 0 && !needsAutoFix && !isAutoFixing) {
      const hasReservasSinFecha = reservasAll.some(r => !r.fecha_clase || r.fecha_clase === 'null' || r.fecha_clase === null);
      if (hasReservasSinFecha) {
        // Solo activar auto-fix una vez, después de un pequeño delay para evitar loops
        const timer = setTimeout(() => {
          if (!hasCheckedAutoFix) {
            setNeedsAutoFix(true);
          }
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        setHasCheckedAutoFix(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const loadUsuarios = async () => {
    try {
      const res = await fetchWithErrorHandling('/api/usuarios', {}, {
        route: '/api/usuarios',
        operation: 'load_usuarios'
      });
      const data = await res.json();
      Array.isArray(data) ? setUsuarios(data.filter((u: Usuario) => u.activo)) : setUsuarios([]);
    } catch (error) {
      console.error('Error loading usuarios:', error);
      setUsuarios([]);
    }
  };

  const loadReservasAll = async () => {
    try {
      const url = '/api/reservas?include_reasignaciones=true';
      console.log('[loadReservasAll] 🔄 Cargando TODAS las reservas (sin filtro de fecha)');

      // La limpieza de inconsistencias se ejecuta automáticamente en el backend al consultar reservas
      const res = await fetchWithErrorHandling(url, {}, {
        route: '/api/reservas',
        operation: 'load_reservas_all'
      });
      const data = await res.json();
      
      // Después de cargar reservas, recargar lista de espera para asegurar consistencia
      await loadListaEsperaCounts();

      if (Array.isArray(data)) {
        console.log('[loadReservasAll] ✅ Reservas cargadas:', {
          total: data.length,
          reservas: data.map((r: Reserva) => ({
            usuario_id: r.usuario_id,
            clase_id: r.clase_id,
            nombre: `${r.apellido}, ${r.nombre}`,
            fecha_clase: r.fecha_clase || null,
            es_reasignacion: r.es_reasignacion || 0
          }))
        });
        setReservasAll(data);
        setRefreshCounter(prev => prev + 1);
        return data;
      } else {
        console.warn('[loadReservasAll] ⚠️ Respuesta no es un array:', typeof data, data);
        setReservasAll([]);
        return [];
      }
    } catch (error) {
      console.error('[loadReservasAll] ❌ Error loading reservas:', error);
      setReservasAll([]);
      return [];
    }
  };

  const loadReservasModal = async (fechaClase: string) => {
    try {
      const url = `/api/reservas?include_reasignaciones=true&fecha_clase=${fechaClase}`;
      console.log('[loadReservasModal] 🔄 Cargando reservas con fecha específica (backend filtrará cancelaciones):', fechaClase);

      const res = await fetchWithErrorHandling(url, {}, {
        route: '/api/reservas',
        operation: 'load_reservas_modal'
      });
      const data = await res.json();

      if (Array.isArray(data)) {
        setReservasModal(data);
        return data;
      } else {
        console.warn('[loadReservasModal] ⚠️ Respuesta no es un array:', typeof data, data);
        setReservasModal([]);
        return [];
      }
    } catch (error) {
      console.error('[loadReservasModal] ❌ Error loading reservas:', error);
      setReservasModal([]);
      return [];
    }
  };

  const loadListaEsperaCounts = async () => {
    if (clases.length === 0) return;

    // Generar todas las fechas del calendario (próximos 30 días)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fechaSet = new Set<string>();
    
    // Incluir fechas de reservas temporales existentes
    reservasAll.forEach(r => {
      if (r.fecha_clase && r.fecha_clase !== 'null' && r.fecha_clase !== null) {
        fechaSet.add(r.fecha_clase);
      }
    });

    // Generar fechas para los próximos 30 días que corresponden a días de clases
    const diaMap: { [key: number]: string } = { 1: 'Lun', 2: 'Mar', 4: 'Jue', 6: 'Sab' };
    for (let i = 0; i < 30; i++) {
      const fecha = new Date(today);
      fecha.setDate(today.getDate() + i);
      const diaSemana = fecha.getDay();
      if (diaMap[diaSemana]) {
        fechaSet.add(fecha.toISOString().split('T')[0]);
      }
    }

    // Construir array de combinaciones para el endpoint batch
    const combinaciones: Array<{ clase_id: number; fecha_clase: string }> = [];
    clases.forEach(clase => {
      fechaSet.forEach(fecha => {
        combinaciones.push({ clase_id: clase.id, fecha_clase: fecha });
      });
    });

    if (combinaciones.length === 0) {
      setListaEsperaCounts(new Map());
      return;
    }

    // Usar endpoint batch para obtener todos los conteos en una sola llamada
    try {
      const res = await fetchWithErrorHandling('/api/reservas/lista-espera-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ combinaciones })
      }, {
        route: '/api/reservas/lista-espera-counts',
        operation: 'load_lista_espera_counts_batch'
      });

      const data = await res.json();
      const countsMap = new Map<string, number>();

      if (data.counts && typeof data.counts === 'object') {
        Object.entries(data.counts).forEach(([key, value]) => {
          countsMap.set(key, Number(value) || 0);
        });
      }

      setListaEsperaCounts(countsMap);
      console.log('[loadListaEsperaCounts] ✅ Lista de espera cargada (batch) para', countsMap.size, 'combinaciones clase-fecha');
    } catch (error) {
      console.error('[loadListaEsperaCounts] ❌ Error cargando conteos batch, usando fallback:', error);
      // Fallback: cargar conteos individuales (más lento pero funciona)
      const countsMap = new Map<string, number>();
      const batchSize = 10;
      
      for (let i = 0; i < combinaciones.length; i += batchSize) {
        const batch = combinaciones.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (c) => {
            try {
              const res = await fetch(`/api/reservas/lista-espera?clase_id=${c.clase_id}&fecha_clase=${c.fecha_clase}`);
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                  const key = `${c.clase_id}-${c.fecha_clase}`;
                  countsMap.set(key, data.length);
                }
              }
            } catch (e) {
              // Ignorar errores individuales
            }
          })
        );
      }
      
      setListaEsperaCounts(countsMap);
      console.log('[loadListaEsperaCounts] ✅ Lista de espera cargada (fallback) para', countsMap.size, 'combinaciones clase-fecha');
    }
  };

  const loadClases = async () => {
    try {
      const res = await fetchWithErrorHandling('/api/clases', {}, {
        route: '/api/clases',
        operation: 'load_clases'
      });
      const data = await res.json();
      Array.isArray(data) ? setClases(data) : setClases([]);
    } catch (error) {
      console.error('Error loading clases:', error);
      setClases([]);
    }
  };

  const loadCancelaciones = async () => {
    try {
      console.log('[loadCancelaciones] 🔄 Cargando cancelaciones...');
      const res = await fetch('/api/cancelaciones');
      console.log('[loadCancelaciones] Respuesta recibida:', {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('[loadCancelaciones] Datos recibidos:', {
          esArray: Array.isArray(data),
          longitud: Array.isArray(data) ? data.length : 0,
          datos: data
        });
        
        if (Array.isArray(data)) {
          setCancelaciones(data);
          console.log('[loadCancelaciones] ✅ Cancelaciones cargadas:', data.length, 'items');
        } else {
          console.warn('[loadCancelaciones] ⚠️ Datos no son un array:', data);
          setCancelaciones([]);
        }
      } else {
        // Si el endpoint no existe o devuelve error, simplemente usar array vacío
        console.warn('[loadCancelaciones] ⚠️ Endpoint no disponible o error:', res.status, res.statusText);
        const errorText = await res.text().catch(() => '');
        console.warn('[loadCancelaciones] Error details:', errorText);
        setCancelaciones([]);
      }
    } catch (error: any) {
      console.error('[loadCancelaciones] ❌ Error de red:', error.message);
      setCancelaciones([]);
    }
  };


  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        await Promise.all([loadUsuarios(), loadClases(), loadReservasAll(), loadCancelaciones()]);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (listaEspera.length > 0 && selectedClase) {
      console.log('[useEffect listaEspera] 🔍 Estado listaEspera actualizado:', {
        length: listaEspera.length,
        items: listaEspera,
        claseId: selectedClase.clase.id,
        fecha: selectedClase.fecha.toISOString().split('T')[0]
      });
    }
  }, [listaEspera, selectedClase]);

  const getDiaNombre = (dia: string) => {
    const dias: { [key: string]: string } = {
      'Lun': 'Lunes',
      'Mar': 'Martes',
      'Jue': 'Jueves',
      'Sab': 'Sábado'
    };
    return dias[dia] || dia;
  };

  const calendarData = useMemo(() => {
    // No retornar vacío si está cargando, permitir que se renderice el loading
    if (!clases || clases.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const calendar: CalendarItem[] = [];

    for (let i = 0; i <= 30; i++) {
      const fecha = new Date(today);
      fecha.setDate(today.getDate() + i);

      const diaMap: { [key: number]: string } = { 1: 'Lun', 2: 'Mar', 4: 'Jue', 6: 'Sab' };
      const diaClase = diaMap[fecha.getDay()];

      if (diaClase) {
        const fechaStr = fecha.toISOString().split('T')[0];
        const clasesDelDia = clases
          .filter(c => c.dia === diaClase)
          .map(clase => {
            const reservasClase = reservasAll.filter(r => {
              if (r.clase_id !== clase.id) return false;
              
              const esFija = !r.fecha_clase || r.fecha_clase === 'null' || r.fecha_clase === null;
              const esTemporal = r.fecha_clase && r.fecha_clase !== 'null' && r.fecha_clase !== null && r.fecha_clase === fechaStr;
              
              return esFija || esTemporal;
            });

            // Filtrar cancelaciones y reservas en lista de espera
            const reservasFiltradas = reservasClase.filter(r => {
              const esReasignacion = r.es_reasignacion === 1 || r.es_reasignacion === true || Number(r.es_reasignacion) === 1;
              const tieneFecha = r.fecha_clase && r.fecha_clase !== 'null' && r.fecha_clase !== null && r.fecha_clase !== '';
              
              // Si es reserva temporal para esta fecha, verificar cancelación
              if (esReasignacion && tieneFecha && r.fecha_clase === fechaStr) {
                const cancelada = cancelaciones.some(c => 
                  Number(c.usuario_id) === Number(r.usuario_id) && 
                  Number(c.clase_id) === Number(r.clase_id) && 
                  c.fecha_clase === fechaStr
                );
                if (cancelada) return false;
              }

              // Si es reserva fija (sin fecha_clase), verificar si tiene cancelación para esta fecha específica
              if (!esReasignacion && !tieneFecha) {
                const cancelada = cancelaciones.some(c => 
                  Number(c.usuario_id) === Number(r.usuario_id) && 
                  Number(c.clase_id) === Number(r.clase_id) && 
                  c.fecha_clase === fechaStr
                );
                if (cancelada) return false;
              }

              // Excluir si hay una reasignación temporal para esta fecha y el usuario ya está en lista de espera
              if (esReasignacion && tieneFecha) {
                const usuarioEnListaEspera = listaEspera.some(le => Number(le.usuario_id) === Number(r.usuario_id));
                if (usuarioEnListaEspera) return false;
              }

              return true;
            });

            // Eliminar duplicados por usuario_id
            const seen = new Set<number>();
            const reservasUnicas = reservasFiltradas.filter(r => {
              if (seen.has(r.usuario_id)) return false;
              seen.add(r.usuario_id);
              return true;
            });

            return {
              clase,
              fecha: new Date(fecha),
              reservas: reservasUnicas
            };
          })
          // Mostrar todas las clases, incluso si no tienen reservas

        if (clasesDelDia.length > 0) {
          const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
          const dayNum = d.getUTCDay() || 7;
          d.setUTCDate(d.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          const semana = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

          calendar.push({
            fecha: new Date(fecha),
            diaSemana: getDiaNombre(diaClase),
            semana,
            clases: clasesDelDia
          });
        }
      }
    }

    return calendar;
  }, [clases, reservasAll, cancelaciones, listaEspera, loading, refreshCounter]);

  const handleCloseModal = () => {
    setListaEspera([]);
    setSearchAlumnoTemporal('');
    setProcessing(false);
    setSelectedClase(null);
    setReservasModal([]);
    setShowModal(false);
    setRefreshCounter(prev => prev + 1);
  };

  const handleClaseClick = async (clase: Clase, fecha: Date) => {
    setSelectedClase({ clase, fecha });
    setShowModal(true);
    const fechaStr = fecha.toISOString().split('T')[0];
    
    // Primero recargar reservas (esto ejecutará la limpieza automática en el backend)
    await loadReservasModal(fechaStr);
    
    // Esperar un momento para que la limpieza se complete
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      console.log(`[handleClaseClick] 🔄 Cargando lista de espera para clase ${clase.id}, fecha ${fechaStr}...`);
      const res = await fetchWithErrorHandling(
        `/api/reservas/lista-espera?clase_id=${clase.id}&fecha_clase=${fechaStr}`,
        {},
        {
          route: '/api/reservas/lista-espera',
          operation: 'load_lista_espera'
        }
      );
      const data = await res.json();

      console.log('[handleClaseClick] 📦 Lista de espera recibida:', data, 'Tipo:', typeof data, 'Es array:', Array.isArray(data));

      if (Array.isArray(data)) {
        const normalized = data.map((item: any, idx: number) => ({
          usuario_id: item.usuario_id,
          numero: item.numero !== undefined ? item.numero : idx + 1,
          nombre: item.nombre || '',
          apellido: item.apellido || ''
        }));
        setListaEspera(normalized);
        console.log(`[handleClaseClick] ✅ Lista de espera cargada: ${normalized.length} items`);
        normalized.forEach((item: ListaEsperaItem, idx: number) => {
          console.log(`  📋 [${idx + 1}] ${item.apellido}, ${item.nombre} (usuario_id: ${item.usuario_id})`);
        });
      } else {
        console.warn('[handleClaseClick] ⚠️ Respuesta no es un array, estableciendo lista vacía');
        setListaEspera([]);
      }
    } catch (error) {
      console.error('[handleClaseClick] ❌ Error loading lista de espera:', error);
      setListaEspera([]);
    }

    setSearchAlumnoTemporal('');
    setProcessing(false);
  };

  const getUsuariosDisponiblesParaTemporal = () => {
    if (!selectedClase) return [];

    const fechaStr = selectedClase.fecha.toISOString().split('T')[0];
    const claseId = selectedClase.clase.id;
    const base = reservasModal.length > 0 ? reservasModal : reservasAll;

    // Usuarios con reservas fijas (sin fecha_clase o fecha_clase null)
    const usuariosFijos = new Set(
      base
        .filter(r => r.clase_id === claseId && (!r.es_reasignacion || r.es_reasignacion === 0) && (!r.fecha_clase || r.fecha_clase === 'null' || r.fecha_clase === null))
        .map(r => r.usuario_id)
    );

    // Usuarios con reservas temporales confirmadas para esta fecha
    // getReservasTemporales ya filtra correctamente por fecha y es_reasignacion
    const reservasTemporalesParaFecha = getReservasTemporales(claseId, selectedClase.fecha);
    const usuariosTemporalesConfirmados = new Set(
      reservasTemporalesParaFecha
        .filter(r => {
          // Excluir los que están en lista de espera
          const enListaEspera = listaEspera.some(le => Number(le.usuario_id) === Number(r.usuario_id));
          return !enListaEspera;
        })
        .map(r => Number(r.usuario_id))
    );

    console.log('[getUsuariosDisponiblesParaTemporal] Filtrado para clase', claseId, 'fecha', fechaStr, ':', {
      totalUsuarios: usuarios.length,
      usuariosFijos: Array.from(usuariosFijos),
      usuariosTemporalesConfirmados: Array.from(usuariosTemporalesConfirmados),
      reservasTemporales: reservasTemporalesParaFecha.length,
      listaEspera: listaEspera.length
    });

    const disponibles = usuarios
      .filter(u => {
        const esFijo = usuariosFijos.has(u.id);
        const esTemporal = usuariosTemporalesConfirmados.has(u.id);
        return !esFijo && !esTemporal;
      })
      .filter(u => {
        if (!searchAlumnoTemporal.trim()) return true;
        const search = searchAlumnoTemporal.toLowerCase();
        return (
          u.nombre.toLowerCase().includes(search) ||
          u.apellido.toLowerCase().includes(search) ||
          `${u.apellido}, ${u.nombre}`.toLowerCase().includes(search)
        );
      });

    console.log('[getUsuariosDisponiblesParaTemporal] Usuarios disponibles después de filtrar:', disponibles.length, 'de', usuarios.length);
    
    return disponibles;
  };

  const getReservasTemporales = (claseId: number, fecha: Date): Reserva[] => {
    const base = selectedClase ? (reservasModal.length > 0 ? reservasModal : reservasAll) : reservasAll;
    if (!selectedClase) return base.filter(r => r.clase_id === claseId);
    
    const fechaStr = fecha.toISOString().split('T')[0];
    const temporales = base.filter(r => {
      if (Number(r.clase_id) !== Number(claseId)) return false;
      const esReasignacion = r.es_reasignacion === 1 || r.es_reasignacion === true || Number(r.es_reasignacion) === 1;
      const tieneFecha = r.fecha_clase && r.fecha_clase !== 'null' && r.fecha_clase !== null && r.fecha_clase !== '';
      const fechaCoincide = tieneFecha && r.fecha_clase === fechaStr;
      return esReasignacion && fechaCoincide;
    });
    
    console.log('[getReservasTemporales] Filtrado para clase', claseId, 'fecha', fechaStr, ':', {
      totalReservas: base.length,
      temporalesEncontradas: temporales.length,
      detalles: temporales.map(r => ({
        usuario_id: r.usuario_id,
        clase_id: r.clase_id,
        nombre: `${r.apellido}, ${r.nombre}`,
        fecha_clase: r.fecha_clase,
        es_reasignacion: r.es_reasignacion
      }))
    });
    
    return temporales;
  };

  const getReservasFijas = (claseId: number, fecha: Date): Reserva[] => {
    const fechaStr = fecha.toISOString().split('T')[0];
    
    return reservasAll.filter(r => {
      if (Number(r.clase_id) !== Number(claseId)) return false;
      const esReasignacion = r.es_reasignacion === 1 || r.es_reasignacion === true || Number(r.es_reasignacion) === 1;
      const tieneFecha = r.fecha_clase && r.fecha_clase !== 'null' && r.fecha_clase !== null && r.fecha_clase !== '';
      
      // Debe ser una reserva fija (sin fecha_clase y sin es_reasignacion)
      if (esReasignacion || tieneFecha) return false;
      
      // Excluir si tiene cancelación para esta fecha específica
      const tieneCancelacion = cancelaciones.some(c => 
        Number(c.usuario_id) === Number(r.usuario_id) && 
        Number(c.clase_id) === Number(r.clase_id) && 
        c.fecha_clase === fechaStr
      );
      
      if (tieneCancelacion) {
        console.log('[getReservasFijas] Excluyendo reserva fija con cancelación:', {
          usuario_id: r.usuario_id,
          clase_id: r.clase_id,
          fecha_clase: fechaStr,
          nombre: `${r.apellido}, ${r.nombre}`
        });
        return false;
      }
      
      return true;
    });
  };

  const handleDeleteReserva = async (reserva: Reserva) => {
    console.log('[handleDeleteReserva] FUNCIÓN LLAMADA - INICIO', {
      reserva,
      selectedClase,
      reserva_usuario_id: reserva.usuario_id,
      reserva_clase_id: reserva.clase_id,
      reserva_fecha_clase: reserva.fecha_clase
    });

    if (!selectedClase) {
      console.error('[handleDeleteReserva] ERROR: selectedClase es null/undefined');
      return;
    }

    console.log('[handleDeleteReserva] Mostrando diálogo de confirmación...');
    if (!window.confirm('¿Estás seguro de eliminar esta reserva?')) {
      console.log('[handleDeleteReserva] Usuario canceló la eliminación');
      return;
    }

    console.log('[handleDeleteReserva] Usuario confirmó, procediendo con eliminación...');
    setProcessing(true);

    try {
      const tieneFecha = reserva.fecha_clase && reserva.fecha_clase !== 'null' && reserva.fecha_clase !== null && reserva.fecha_clase !== '';
      const esReasignacion = reserva.es_reasignacion === 1 || reserva.es_reasignacion === true || Number(reserva.es_reasignacion) === 1;
      const esTemporal = tieneFecha && esReasignacion;

      let fechaClase: string | undefined;
      if (selectedClase && selectedClase.fecha) {
        fechaClase = selectedClase.fecha.toISOString().split('T')[0];
        if (esTemporal) {
          console.log('[handleDeleteReserva] 🔍 Reserva temporal eliminada desde modal calendario - usando fecha del modal:', fechaClase);
        } else {
          console.log('[handleDeleteReserva] 🔍 Reserva fija eliminada desde modal calendario - usando fecha del modal para cancelación específica:', fechaClase);
        }
      } else if (esTemporal) {
        fechaClase = reserva.fecha_clase || undefined;
        console.log('[handleDeleteReserva] 🔍 Reserva temporal eliminada (sin modal) - usando fecha de la reserva:', fechaClase);
      } else {
        fechaClase = undefined;
        console.log('[handleDeleteReserva] 🔍 Reserva fija eliminada permanentemente (sin modal) - no pasar fecha_clase');
      }

      let url = `/api/reservas?usuario_id=${reserva.usuario_id}&clase_id=${selectedClase.clase.id}`;
      if (fechaClase) {
        url += `&fecha_clase=${encodeURIComponent(fechaClase)}`;
      }

      console.log('[handleDeleteReserva] Análisis de reserva:', {
        reserva_fecha_clase: reserva.fecha_clase,
        tieneFechaEspecifica: tieneFecha,
        esReasignacion,
        esTemporal,
        fechaClase_enviada: fechaClase || 'NINGUNA (reserva fija)',
        reserva_es_reasignacion: reserva.es_reasignacion,
        reserva_id: reserva.id,
        reserva_usuario_id: reserva.usuario_id,
        reserva_clase_id: reserva.clase_id
      });

      console.log('[handleDeleteReserva] Eliminando reserva:', {
        usuario_id: reserva.usuario_id,
        clase_id: selectedClase.clase.id,
        fecha_clase_original: reserva.fecha_clase,
        fecha_clase_enviada: fechaClase || 'NINGUNA (reserva fija)',
        es_reasignacion: reserva.es_reasignacion,
        tipo: esTemporal ? 'TEMPORAL' : 'FIJA',
        url
      });

      console.log('[handleDeleteReserva] Llamando a:', url);
      const res = await fetch(url, { method: 'DELETE' });

      console.log('[handleDeleteReserva] Respuesta recibida:', {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText
      });

      if (!res.ok) {
        let errorMsg = 'Error al eliminar reserva';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
          console.error('[handleDeleteReserva] Error del servidor:', data);
        } catch {
          errorMsg = `Error ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMsg);
      }

      let responseData: any = null;
      try {
        const text = await res.text();
        if (text) {
          responseData = JSON.parse(text);
          console.log('[handleDeleteReserva] Respuesta del servidor:', responseData);
          
          // Si el servidor indica que hay cambios en el cupo, esperar un poco más
          if (responseData && responseData.cupoFinal) {
            console.log('[handleDeleteReserva] 📊 Estado final del cupo:', responseData.cupoFinal);
            // Esperar un poco más para asegurar que todas las operaciones del backend terminaron
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      } catch {
        console.log('[handleDeleteReserva] Respuesta vacía o inválida, continuando...');
      }

      // Esperar un momento para que el backend complete todas las operaciones (cancelación + promoción)
      await new Promise(resolve => setTimeout(resolve, 500));

      if (selectedClase) {
        const fechaStr = selectedClase.fecha.toISOString().split('T')[0];
        
        // PRIMERO: Recargar cancelaciones (necesario para el filtrado en calendarData)
        console.log('[handleDeleteReserva] 🔄 Recargando cancelaciones...');
        await loadCancelaciones();
        console.log('[handleDeleteReserva] ✅ Cancelaciones recargadas');

        // SEGUNDO: Recargar TODAS las reservas sin filtro (el frontend filtrará cancelaciones en useMemo)
        // Esto asegura que tengamos TODAS las reservas y el calendarData las filtre correctamente
        console.log('[handleDeleteReserva] 🔄 Recargando TODAS las reservas para actualizar cards...');
        await loadReservasAll();
        console.log('[handleDeleteReserva] ✅ Todas las reservas recargadas');

        // CUARTO: Recargar lista de espera detallada para el modal
        await new Promise(resolve => setTimeout(resolve, 200));
        try {
          console.log('[handleDeleteReserva] Recargando lista de espera detallada para el modal...');
          const listaRes = await fetch(`/api/reservas/lista-espera?clase_id=${selectedClase.clase.id}&fecha_clase=${fechaStr}`);
          if (listaRes.ok) {
            const listaData = await listaRes.json();
            if (Array.isArray(listaData)) {
              setListaEspera(listaData);
              console.log('[handleDeleteReserva] Lista de espera actualizada:', listaData.length, 'items');
            }
          }
        } catch (error) {
          console.error('Error reloading lista de espera:', error);
        }

        // QUINTO: Recargar conteos de lista de espera para todas las fechas (esto actualizará las cards)
        console.log('[handleDeleteReserva] Recargando conteos de lista de espera...');
        await loadListaEsperaCounts();
        console.log('[handleDeleteReserva] Conteos de lista de espera recargados');
        
        // SEXTO: Forzar actualización del calendarData incrementando refreshCounter
        // Esto asegura que el useMemo se recalcule con los nuevos datos
        console.log('[handleDeleteReserva] Forzando recálculo del calendarData...');
        setRefreshCounter(prev => prev + 1);
        
        // No activar auto-fix automáticamente para evitar loops
        // setNeedsAutoFix(true);
      } else {
        // Si no hay selectedClase, recargar todo sin fecha específica
        console.log('[handleDeleteReserva] Recargando TODAS las reservas para actualizar cards...');
        await loadReservasAll();
        console.log('[handleDeleteReserva] Todas las reservas recargadas');
        await loadCancelaciones();
        console.log('[handleDeleteReserva] Cancelaciones recargadas');
        await loadListaEsperaCounts();
        console.log('[handleDeleteReserva] Conteos de lista de espera recargados');
        
        // Forzar actualización del calendarData
        console.log('[handleDeleteReserva] 🔄 Forzando recálculo del calendarData con refreshCounter...');
        setRefreshCounter(prev => prev + 1);
      }

      // El refreshCounter ya se incrementó arriba, no necesitamos hacerlo aquí
      console.log('[handleDeleteReserva] Eliminación completada exitosamente, modal y cards actualizados');
    } catch (error: any) {
      console.error('[handleDeleteReserva] Error completo:', error);
      console.error('[handleDeleteReserva] Stack:', error.stack);
      alert(error.message || 'Error al eliminar reserva. Revisa la consola para más detalles.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteListaEspera = async (usuarioId: number) => {
    console.log('[handleDeleteListaEspera] FUNCIÓN LLAMADA', {
      usuarioId,
      selectedClase
    });

    if (!selectedClase) {
      console.error('[handleDeleteListaEspera] ERROR: selectedClase es null/undefined');
      return;
    }

    if (!window.confirm('¿Estás seguro de eliminar este alumno de la lista de espera?')) {
      console.log('[handleDeleteListaEspera] Usuario canceló la eliminación');
      return;
    }

    setProcessing(true);

    try {
      const fechaStr = selectedClase.fecha.toISOString().split('T')[0];
      const url = `/api/reservas/lista-espera?usuario_id=${usuarioId}&clase_id=${selectedClase.clase.id}&fecha_clase=${fechaStr}`;

      console.log('[handleDeleteListaEspera] Llamando a:', url);
      const res = await fetch(url, { method: 'DELETE' });

      console.log('[handleDeleteListaEspera] Respuesta recibida:', {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText
      });

      if (!res.ok) {
        let errorMsg = 'Error al eliminar de lista de espera';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
          console.error('[handleDeleteListaEspera] Error del servidor:', data);
        } catch {
          errorMsg = `Error ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMsg);
      }

      console.log('[handleDeleteListaEspera] Recargando lista de espera...');
      const listaRes = await fetch(`/api/reservas/lista-espera?clase_id=${selectedClase.clase.id}&fecha_clase=${fechaStr}`);
      if (listaRes.ok) {
        const listaData = await listaRes.json();
        if (Array.isArray(listaData)) {
          setListaEspera(listaData);
          console.log('[handleDeleteListaEspera] Lista de espera actualizada:', listaData.length, 'items');
        }
      }

      console.log('[handleDeleteListaEspera] Recargando TODAS las reservas para actualizar cards...');
      await loadReservasAll();
      console.log('[handleDeleteListaEspera] Todas las reservas recargadas');
      await loadCancelaciones();
      console.log('[handleDeleteListaEspera] Cancelaciones recargadas');
      await loadReservasModal(fechaStr);
      // No activar auto-fix automáticamente para evitar loops
      // setNeedsAutoFix(true);
      setRefreshCounter(prev => prev + 1);
      console.log('[handleDeleteListaEspera] Eliminación completada exitosamente, modal y cards actualizados');
    } catch (error: any) {
      console.error('[handleDeleteListaEspera] Error completo:', error);
      console.error('[handleDeleteListaEspera] Stack:', error.stack);
      alert(error.message || 'Error al eliminar de lista de espera. Revisa la consola para más detalles.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddTemporal = async (usuarioId: number) => {
    if (!selectedClase || processing || loading) return;

    setProcessing(true);
    try {
      const fechaStr = selectedClase.fecha.toISOString().split('T')[0];

      console.log('========================================');
      console.log('[handleAddTemporal] CÁLCULO DE VALIDACIÓN - ANTES DE AGREGAR');
      console.log('========================================');
      console.log(`Clase: ${selectedClase.clase.nombre} (ID: ${selectedClase.clase.id})`);
      console.log(`Fecha: ${fechaStr}`);
      console.log(`Usuario a agregar: ${usuarioId}`);
      console.log('');

      let listaEsperaAntes = 0;
      try {
        const diagRes = await fetch(`/api/reservas/diagnostico-clase?clase_id=${selectedClase.clase.id}&fecha_clase=${fechaStr}`);
        if (diagRes.ok) {
          const diagData = await diagRes.json();
          const resumen = diagData.resumen || {};
          const reservasFijas = resumen.reservasFijas || 0;
          const reservasTemporales = resumen.reservasTemporales || 0;
          const alumnosConfirmados = resumen.alumnosConfirmados || 0;
          const cupoMaximo = resumen.cupoMaximo || 35;
          listaEsperaAntes = resumen.listaEspera || 0;

          console.log('📊 ESTADO ACTUAL DE LA CLASE:');
          console.log(`   - Alumnos Fijos: ${reservasFijas}`);
          console.log(`   - Temporales Confirmados: ${reservasTemporales}`);
          console.log(`   - Total Confirmados: ${alumnosConfirmados} (${reservasFijas} + ${reservasTemporales})`);
          console.log(`   - Cupo Máximo: ${cupoMaximo}`);
          console.log(`   - En Lista de Espera: ${listaEsperaAntes}`);
          console.log('');
          console.log('🔍 VALIDACIÓN:');
          console.log(`   Condición: totalConfirmados (${alumnosConfirmados}) >= cupoMaximo (${cupoMaximo})`);
          const debeIrAListaEspera = alumnosConfirmados >= cupoMaximo;
          console.log(`   Resultado: ${debeIrAListaEspera ? '✅ SÍ' : '❌ NO'} → ${debeIrAListaEspera ? 'DEBE ir a lista de espera' : 'Puede confirmarse'}`);
          console.log('');
        } else {
          console.warn('⚠️ No se pudo obtener diagnóstico antes de agregar');
        }
      } catch (error) {
        console.warn('⚠️ Error obteniendo diagnóstico:', error);
      }

      console.log('🚀 AGREGANDO TEMPORAL...');
      const res = await fetchWithErrorHandling(
        '/api/reservas/temporal',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_id: usuarioId,
            clase_id: selectedClase.clase.id,
            fecha_clase: fechaStr
          })
        },
        {
          route: '/api/reservas/temporal',
          operation: 'add_temporal'
        }
      );
      const data = await res.json();

      console.log('');
      console.log('📦 RESPUESTA DEL SERVIDOR:');
      console.log(`   success: ${data.success}`);
      console.log(`   enListaEspera: ${data.enListaEspera}`);
      if (data.mensaje) console.log(`   mensaje: ${data.mensaje}`);
      console.log('');

      if (res.ok) {
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('========================================');
        console.log('[handleAddTemporal] ESTADO DESPUÉS DE AGREGAR');
        console.log('========================================');

        try {
          const diagRes = await fetch(`/api/reservas/diagnostico-clase?clase_id=${selectedClase.clase.id}&fecha_clase=${fechaStr}`);
          if (diagRes.ok) {
            const diagData = await diagRes.json();
            const resumen = diagData.resumen || {};
            const reservasFijas = resumen.reservasFijas || 0;
            const reservasTemporales = resumen.reservasTemporales || 0;
            const alumnosConfirmados = resumen.alumnosConfirmados || 0;
            const listaEsperaDespues = resumen.listaEspera || 0;

            console.log('📊 ESTADO DESPUÉS:');
            console.log(`   - Alumnos Fijos: ${reservasFijas}`);
            console.log(`   - Temporales Confirmados: ${reservasTemporales}`);
            console.log(`   - Total Confirmados: ${alumnosConfirmados}`);
            console.log(`   - En Lista de Espera: ${listaEsperaDespues}`);
            console.log('');

            const detalles = diagData.detalles || {};
            const listaEsperaDetalles = detalles.listaEspera || [];
            const usuarioEnListaEspera = listaEsperaDetalles.some((item: any) => item.usuario_id === usuarioId);

            console.log('✅ VERIFICACIÓN FINAL:');
            console.log(`   - Respuesta dice enListaEspera: ${data.enListaEspera}`);
            console.log(`   - Usuario ${usuarioId} está en lista de espera (BD): ${usuarioEnListaEspera ? '✅ SÍ' : '❌ NO'}`);
            console.log(`   - Lista de espera aumentó: ${listaEsperaDespues > listaEsperaAntes ? `✅ SÍ (de ${listaEsperaAntes} a ${listaEsperaDespues})` : '❌ NO'}`);

            if (data.enListaEspera && !usuarioEnListaEspera) {
              console.warn('⚠️ ADVERTENCIA: La respuesta dice que fue a lista de espera, pero no está en la BD');
            } else if (!data.enListaEspera && usuarioEnListaEspera) {
              console.warn('⚠️ ADVERTENCIA: La respuesta dice que NO fue a lista de espera, pero SÍ está en la BD');
            }

            console.log('========================================');
          } else {
            console.warn('⚠️ No se pudo obtener diagnóstico después de agregar');
          }
        } catch (error) {
          console.warn('⚠️ Error obteniendo diagnóstico después:', error);
        }

        await loadReservasAll();
        console.log('[handleAddTemporal] Todas las reservas recargadas para actualizar cards del calendario');
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
          console.log(`[handleAddTemporal] 🔄 Recargando lista de espera para clase ${selectedClase.clase.id}, fecha ${fechaStr}...`);
          const listaRes = await fetch(`/api/reservas/lista-espera?clase_id=${selectedClase.clase.id}&fecha_clase=${fechaStr}`);
          console.log('[handleAddTemporal] Respuesta lista de espera:', listaRes.ok, listaRes.status);

          if (listaRes.ok) {
            const listaData = await listaRes.json();
            console.log('[handleAddTemporal] 📦 Datos de lista de espera recibidos:', listaData);
            console.log('[handleAddTemporal] 📦 Tipo de datos:', typeof listaData, Array.isArray(listaData));
            console.log('[handleAddTemporal] 📦 Cantidad de items:', Array.isArray(listaData) ? listaData.length : 'NO ES ARRAY');

            if (Array.isArray(listaData)) {
              const normalized = listaData.map((item: any, idx: number) => ({
                usuario_id: item.usuario_id,
                numero: item.numero !== undefined ? item.numero : idx + 1,
                nombre: item.nombre || '',
                apellido: item.apellido || ''
              }));

              console.log('[handleAddTemporal] ✅ Lista de espera normalizada:', normalized);
              setListaEspera(normalized);
              console.log(`[handleAddTemporal] ✅ Estado listaEspera actualizado con ${normalized.length} items`);
              normalized.forEach((item: ListaEsperaItem, idx: number) => {
                console.log(`  📋 [${idx + 1}] ${item.apellido}, ${item.nombre} (usuario_id: ${item.usuario_id}, numero: ${item.numero})`);
              });
            } else {
              console.warn('[handleAddTemporal] ⚠️ Respuesta no es un array:', typeof listaData, listaData);
              setListaEspera([]);
            }
          } else {
            console.error('[handleAddTemporal] ❌ Error en respuesta:', listaRes.status, listaRes.statusText);
            const errorText = await listaRes.text();
            console.error('[handleAddTemporal] Error response body:', errorText);
            setListaEspera([]);
          }
        } catch (error: any) {
          console.error('[handleAddTemporal] ❌ Error reloading lista de espera:', error);
          console.error('[handleAddTemporal] Error stack:', error.stack);
          setListaEspera([]);
        }

        await loadReservasModal(fechaStr);
        // No activar auto-fix automáticamente para evitar loops
        // setNeedsAutoFix(true);
        setRefreshCounter(prev => prev + 1);
        setSearchAlumnoTemporal('');

        // Solo mostrar alert si realmente fue a lista de espera
        // Verificar también en la respuesta del servidor si hay mensaje específico
        if (data.enListaEspera && data.mensaje) {
          alert(data.mensaje);
        } else if (data.enListaEspera) {
          alert('El alumno ha sido agregado a la lista de espera debido al cupo completo');
        }
      } else {
        console.error('❌ ERROR del servidor:', data);
        alert(data.error || 'Error al agregar alumno temporal');
      }
    } catch (error: any) {
      console.error('❌ ERROR:', error);
      alert(error.message || 'Error al agregar alumno temporal');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateRandom = async () => {
    if (!confirm('¿Generar reservas aleatorias para varios alumnos? Esto creará reservas aleatorias.')) return;

    setGeneratingReservas(true);
    try {
      const res = await fetchWithErrorHandling(
        '/api/reservas/generate-random',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        {
          route: '/api/reservas/generate-random',
          operation: 'generate_random_reservas'
        }
      );
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Reservas generadas correctamente');
        await loadReservasAll();
      } else {
        alert(data.error || 'Error al generar reservas');
      }
    } catch (error: any) {
      alert(error.message || 'Error al generar reservas');
    } finally {
      setGeneratingReservas(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('¿Estás seguro de borrar TODAS las reservas? Esta acción no se puede deshacer.')) return;
    if (!confirm('⚠️ ADVERTENCIA: Esto eliminará TODAS las reservas (fijas y temporales). ¿Estás completamente seguro?')) return;

    setClearingReservas(true);
    try {
      const res = await fetchWithErrorHandling(
        '/api/reservas/clear-all',
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        },
        {
          route: '/api/reservas/clear-all',
          operation: 'clear_all_reservas'
        }
      );
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Todas las reservas han sido eliminadas');
        await loadReservasAll();
      } else {
        alert(data.error || 'Error al borrar reservas');
      }
    } catch (error: any) {
      alert(error.message || 'Error al borrar reservas');
    } finally {
      setClearingReservas(false);
    }
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
          {showDebugButtons && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={handleGenerateRandom}
                disabled={generatingReservas || clearingReservas || processing}
                className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
              >
                {generatingReservas ? 'Generando...' : 'Generar Reservas Aleatorias'}
              </button>
              <button
                onClick={handleClearAll}
                disabled={generatingReservas || clearingReservas || processing}
                className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
              >
                {clearingReservas ? 'Borrando...' : '🗑️ Borrar Todas las Reservas'}
              </button>
            </div>
          )}
        </div>

        {(loading || processing) && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-gray-700 font-medium text-lg">
                {loading ? 'Cargando datos...' : 'Procesando...'}
              </p>
              <p className="text-gray-500 text-sm text-center">
                Por favor espera mientras se actualiza la información
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">Cargando calendario...</p>
          </div>
        ) : calendarData.length === 0 ? (
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
                      {item.clases.map((c, cIdx) => {
                        const fechaStr = c.fecha.toISOString().split('T')[0];
                        // Filtrar reservas fijas excluyendo las que tienen cancelación para esta fecha
                        const reservasFijas = c.reservas.filter(r => {
                          const esReasignacion = r.es_reasignacion === 1 || r.es_reasignacion === true || Number(r.es_reasignacion) === 1;
                          const tieneFecha = r.fecha_clase && r.fecha_clase !== 'null' && r.fecha_clase !== null && r.fecha_clase !== '';
                          // Debe ser una reserva fija (sin fecha_clase y sin es_reasignacion)
                          if (esReasignacion || tieneFecha) return false;
                          // Excluir si tiene cancelación para esta fecha específica
                          const tieneCancelacion = cancelaciones.some(cancel => 
                            Number(cancel.usuario_id) === Number(r.usuario_id) && 
                            Number(cancel.clase_id) === Number(r.clase_id) && 
                            cancel.fecha_clase === fechaStr
                          );
                          return !tieneCancelacion;
                        });
                        const reservasTemporales = c.reservas.filter(r => {
                          const esReasignacion = r.es_reasignacion === 1 || r.es_reasignacion === true || Number(r.es_reasignacion) === 1;
                          const tieneFecha = r.fecha_clase && r.fecha_clase !== 'null' && r.fecha_clase !== null;
                          return tieneFecha && esReasignacion && r.fecha_clase === fechaStr;
                        });
                        const key = `${c.clase.id}-${fechaStr}`;
                        const listaEsperaCount = listaEsperaCounts.get(key) || 0;
                        const tieneTemporales = reservasTemporales.length > 0 || listaEsperaCount > 0;

                        return (
                          <button
                            key={cIdx}
                            onClick={() => !processing && handleClaseClick(c.clase, c.fecha)}
                            disabled={processing}
                            className={`hover:bg-purple-50 border-2 ${
                              tieneTemporales
                                ? 'bg-green-50/30 border-green-400 hover:border-green-500 relative'
                                : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                            } p-4 rounded-lg transition-all text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                            style={tieneTemporales ? {
                              backgroundColor: 'rgba(240, 253, 244, 0.3)',
                              borderColor: '#4ade80',
                              borderWidth: '2px',
                              borderStyle: 'solid'
                            } : undefined}
                          >
                            {tieneTemporales && (
                              <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                                <span>🔄</span>
                                <span>{reservasTemporales.length}</span>
                              </div>
                            )}
                            <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                              {c.clase.nombre}
                              {tieneTemporales && (
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                  Temporal
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">{c.clase.hora}</div>
                            <div className="text-xs text-gray-500 space-y-1">
                              <div>
                                {isAutoFixing ? (
                                  <div className="inline-flex items-center gap-2">
                                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                                    <span className="text-gray-400">calculando...</span>
                                  </div>
                                ) : (
                                  <>
                                    {reservasFijas.length + reservasTemporales.length} {reservasFijas.length + reservasTemporales.length === 1 ? 'alumno inscrito' : 'alumnos inscritos'}
                                  </>
                                )}
                              </div>
                              {isAutoFixing ? (
                                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                              ) : (
                                <>
                                  {reservasTemporales.length > 0 && (
                                    <div className="text-green-700 font-semibold">
                                      {reservasTemporales.length} temporal{reservasTemporales.length > 1 ? 'es' : ''} confirmado{reservasTemporales.length > 1 ? 's' : ''}
                                    </div>
                                  )}
                                  {listaEsperaCount > 0 && (
                                    <div className="text-amber-600 font-semibold">
                                      {listaEsperaCount} {listaEsperaCount === 1 ? 'en lista de espera' : 'en lista de espera'}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showModal && selectedClase && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => {
              if (!processing) handleCloseModal();
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
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
                      if (!processing) handleCloseModal();
                    }}
                    disabled={processing}
                    className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Sección Alumnos Temporales */}
                  <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-green-50/30">
                    <div className="p-3 bg-green-100 border-b border-gray-200 flex-shrink-0">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Alumnos Temporales</h3>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Busca alumnos para agregar como temporal..."
                          value={searchAlumnoTemporal}
                          onChange={(e) => setSearchAlumnoTemporal(e.target.value)}
                          disabled={processing}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {searchAlumnoTemporal.trim() && (
                          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                            {getUsuariosDisponiblesParaTemporal().length === 0 ? (
                              <p className="text-xs text-gray-500 text-center py-3">No se encontraron alumnos disponibles</p>
                            ) : (
                              <div className="divide-y divide-gray-100">
                                {getUsuariosDisponiblesParaTemporal().slice(0, 20).map(usuario => (
                                  <button
                                    key={usuario.id}
                                    onClick={() => handleAddTemporal(usuario.id)}
                                    disabled={processing || loading}
                                    className="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between text-sm"
                                  >
                                    <span className="font-medium text-gray-900">
                                      {usuario.apellido}, {usuario.nombre}
                                    </span>
                                    <span className="text-xs text-purple-600 font-medium">+ Agregar</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                      {getReservasTemporales(selectedClase.clase.id, selectedClase.fecha)
                        .filter(r => {
                          const esReasignacion = r.es_reasignacion === 1 || r.es_reasignacion === true || Number(r.es_reasignacion) === 1;
                          const tieneFecha = r.fecha_clase && r.fecha_clase !== 'null' && r.fecha_clase !== null;
                          const fechaStr = selectedClase.fecha.toISOString().split('T')[0];
                          const fechaCoincide = tieneFecha && r.fecha_clase === fechaStr;
                          const enListaEspera = listaEspera.some(le => le.usuario_id === r.usuario_id);
                          return esReasignacion && fechaCoincide && !enListaEspera;
                        })
                        .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''))
                        .map((r, idx) => {
                          // Asegurar que la reserva tenga fecha_clase para eliminación correcta
                          const fechaClaseReserva = r.fecha_clase && r.fecha_clase !== 'null' && r.fecha_clase !== null 
                            ? r.fecha_clase 
                            : selectedClase.fecha.toISOString().split('T')[0];
                          
                          return (
                            <div
                              key={`temporal-confirmado-${r.id || idx}-${r.usuario_id}-${fechaClaseReserva}`}
                              className="flex items-center justify-between px-3 py-2 rounded-lg border-2 border-green-400 bg-green-50"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-green-600 text-base">🔄</span>
                                <span className="text-sm font-medium text-green-900 truncate">
                                  {r.apellido}, {r.nombre}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs px-2 py-1 bg-green-500 text-white rounded-full font-semibold">TEMPORAL</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (!processing) {
                                      // Asegurar que la reserva tenga fecha_clase para eliminación
                                      const reservaConFecha = { ...r, fecha_clase: fechaClaseReserva };
                                      handleDeleteReserva(reservaConFecha);
                                    }
                                  }}
                                  disabled={processing}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Eliminar reserva temporal"
                                  type="button"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })}

                      {listaEspera && listaEspera.length > 0 && (
                        <>
                          {listaEspera
                            .sort((a, b) => (a.numero || 0) - (b.numero || 0))
                            .map((item, idx) => {
                              console.log('[Render] Renderizando item de lista de espera:', item);
                              return (
                                <div
                                  key={`lista-espera-${item.usuario_id}-${idx}-${refreshCounter}`}
                                  className="flex items-center justify-between px-3 py-2 rounded-lg border-2 border-yellow-300 bg-yellow-50 mb-2"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-yellow-700 text-base">⏳</span>
                                    <span className="text-sm font-medium text-yellow-900 truncate">
                                      {item.apellido || ''}, {item.nombre || ''}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-xs px-2 py-1 bg-yellow-600 text-white rounded-full font-semibold">
                                      {item.numero || idx + 1}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-yellow-600 text-white rounded-full font-semibold">LISTA ESPERA</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        if (!processing) {
                                          console.log('[Lista Espera] Botón X clickeado para usuario_id:', item.usuario_id);
                                          handleDeleteListaEspera(item.usuario_id);
                                        }
                                      }}
                                      disabled={processing}
                                      className="text-red-600 hover:text-red-800 text-lg font-bold px-2 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Eliminar de lista de espera"
                                      type="button"
                                      style={{ zIndex: 10, position: 'relative' }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </>
                      )}

                      {getReservasTemporales(selectedClase.clase.id, selectedClase.fecha).filter(r => {
                        const esReasignacion = r.es_reasignacion === 1 || r.es_reasignacion === true || Number(r.es_reasignacion) === 1;
                        const tieneFecha = r.fecha_clase && r.fecha_clase !== 'null' && r.fecha_clase !== null;
                        const enListaEspera = listaEspera.some(le => le.usuario_id === r.usuario_id);
                        return esReasignacion && tieneFecha && !enListaEspera;
                      }).length === 0 && (!listaEspera || listaEspera.length === 0) && (
                        <p className="text-gray-500 text-sm text-center py-4">No hay alumnos temporales</p>
                      )}
                    </div>
                  </div>

                  {/* Sección Alumnos Fijos */}
                  <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <div className="p-3 bg-gray-100 border-b border-gray-200 flex-shrink-0">
                      <h3 className="text-sm font-semibold text-gray-700">Alumnos Fijos</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                      {getReservasFijas(selectedClase.clase.id, selectedClase.fecha)
                        .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''))
                        .map((r, idx) => (
                          <div
                            key={`fijo-${r.id || idx}-${r.usuario_id}`}
                            className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-white"
                          >
                            <span className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">
                              {r.apellido}, {r.nombre}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (!processing) handleDeleteReserva(r);
                              }}
                              disabled={processing}
                              className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Eliminar de esta fecha (no afecta otras semanas)"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      {getReservasFijas(selectedClase.clase.id, selectedClase.fecha).length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-4">No hay alumnos fijos inscritos</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 flex-shrink-0 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (!processing) handleCloseModal();
                  }}
                  disabled={processing}
                  className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
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
