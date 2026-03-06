// Función helper para validar y normalizar un usuario
function normalizeUsuario(u: any) {
  if (!u || !u.id) return null;
  
  // Eliminar completamente si tiene dni (estructura antigua)
  if (u.dni) {
    return null;
  }
  
  const apellidoStr = String(u.apellido || '').trim();
  const nombreStr = String(u.nombre || '').trim();
  
  // Validar que no sean datos corruptos
  if (!nombreStr || !apellidoStr) {
    return null;
  }
  
  // Reconstruir en orden correcto, SOLO con los campos correctos (sin dni, sin email)
  const usuarioNormalizado: any = {};
  usuarioNormalizado.id = Number(u.id);
  usuarioNormalizado.nombre = nombreStr;
  usuarioNormalizado.apellido = apellidoStr;
  usuarioNormalizado.telefono = u.telefono ? String(u.telefono).trim() : '';
  usuarioNormalizado.fecha_alta = u.fecha_alta ? String(u.fecha_alta).trim() : new Date().toISOString().split('T')[0];
  // Por defecto todos los usuarios están activos
  // Solo desactivar si explícitamente es false o 0
  // Si es undefined, null, o cualquier otro valor, establecer como activo
  if (u.activo === 0 || u.activo === false) {
    usuarioNormalizado.activo = false;
  } else {
    // Por defecto activo = true (incluye undefined, null, 1, true, o cualquier otro valor)
    usuarioNormalizado.activo = true;
  }
  
  return usuarioNormalizado;
}

// Mock de DB para desarrollo local sin Cloudflare
// Usar globalThis para mantener datos entre requests en Next.js
function getMockData() {
  let mockData: any;
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any).__mockDBData) {
      (globalThis as any).__mockDBData = {
        usuarios: [],
        clases: [],
        reservas: [],
        cancelaciones: [],
        lista_espera: [],
        clase_recuperar: [],
        clase_desactivada: []
      };
    }
    mockData = (globalThis as any).__mockDBData;
  } else {
    if (!(global as any).__mockDBData) {
      (global as any).__mockDBData = {
        usuarios: [],
        clases: [],
        reservas: [],
        cancelaciones: [],
        lista_espera: [],
        clase_recuperar: [],
        clase_desactivada: []
      };
    }
    mockData = (global as any).__mockDBData;
  }
  
  // Limpiar datos corruptos cada vez que se accede (más agresivo)
  // Esto asegura que los datos corruptos se eliminen incluso si se agregaron después de la limpieza inicial
  // Eliminar TODOS los usuarios que tengan el campo dni (estructura antigua)
  let usuariosNormalizados = mockData.usuarios
    .filter((u: any) => {
      // Eliminar usuarios con dni (estructura antigua completamente incompatible)
      if (u && u.dni) {
        return false; // Eliminar completamente
      }
      return true;
    })
    .map((u: any) => normalizeUsuario(u))
    .filter((u: any) => u !== null);
  
  // No hay duplicados por email ya que eliminamos ese campo
  mockData.usuarios = usuariosNormalizados.filter((u: any) => u !== null);
  
  return mockData;
}

class MockDB {
  private get data() {
    return getMockData();
  }

  prepare(query: string) {
    return {
      bind: (...args: any[]) => {
        // Asegurarse de que los parámetros sean un array plano
        const params = Array.isArray(args[0]) ? args[0] : args;
        
        return {
          first: async () => {
            const mockData = getMockData();
            
            // Manejar COUNT(*) queries
            if (query.includes('SELECT COUNT(*)') || query.includes('SELECT COUNT(DISTINCT')) {
              if (query.includes('FROM reserva') && query.includes('WHERE clase_id')) {
                // COUNT de reservas por clase_id (puede incluir filtros por fecha_clase y es_reasignacion)
                const claseId = params && params.length > 0 ? Number(params[0]) : null;
                if (claseId !== null) {
                  let reservasFiltradas = mockData.reservas.filter((r: any) => Number(r.clase_id) === claseId);
                  
                  // Filtrar por fecha_clase si está en la query
                  if (query.includes('fecha_clase')) {
                    if (query.includes('fecha_clase IS NULL') || query.includes("fecha_clase = 'null'") || query.includes("fecha_clase = ''")) {
                      // Solo reservas fijas (sin fecha_clase)
                      reservasFiltradas = reservasFiltradas.filter((r: any) => 
                        !r.fecha_clase || r.fecha_clase === null || r.fecha_clase === 'null' || r.fecha_clase === ''
                      );
                      
                      // También filtrar por es_reasignacion si está
                      if (query.includes('es_reasignacion IS NULL') || query.includes('es_reasignacion = 0')) {
                        reservasFiltradas = reservasFiltradas.filter((r: any) => 
                          !r.es_reasignacion || r.es_reasignacion === 0
                        );
                      }
                    } else if (query.includes('fecha_clase = ?')) {
                      // Reservas temporales para una fecha específica
                      const fechaClaseIndex = query.indexOf('fecha_clase = ?');
                      const beforeFechaClase = query.substring(0, fechaClaseIndex);
                      const paramIndex = (beforeFechaClase.match(/\?/g) || []).length;
                      if (params[paramIndex] !== undefined) {
                        const fechaClase = params[paramIndex];
                        reservasFiltradas = reservasFiltradas.filter((r: any) => r.fecha_clase === fechaClase);
                      }
                    }
                  }
                  
                  // Filtrar por es_reasignacion si está en la query
                  if (query.includes('es_reasignacion = 1')) {
                    reservasFiltradas = reservasFiltradas.filter((r: any) => 
                      r.es_reasignacion === 1 || r.es_reasignacion === true
                    );
                  } else if (query.includes('es_reasignacion = 0') || query.includes('es_reasignacion IS NULL')) {
                    reservasFiltradas = reservasFiltradas.filter((r: any) => 
                      !r.es_reasignacion || r.es_reasignacion === 0
                    );
                  }
                  
                  // Si es COUNT(DISTINCT usuario_id), contar usuarios únicos
                  if (query.includes('COUNT(DISTINCT usuario_id)')) {
                    const usuariosUnicos = new Set(reservasFiltradas.map((r: any) => Number(r.usuario_id)));
                    return { count: usuariosUnicos.size };
                  }
                  
                  return { count: reservasFiltradas.length };
                }
              }
              if (query.includes('FROM clase')) {
                // COUNT de clases
                return { count: mockData.clases.length };
              }
              if (query.includes('FROM usuario')) {
                // COUNT de usuarios
                return { count: mockData.usuarios.length };
              }
              if (query.includes('FROM reserva')) {
                // COUNT de reservas (sin filtros)
                return { count: mockData.reservas.length };
              }
            }
            
            if (query.includes('SELECT') && query.includes('WHERE')) {
              // Manejar SELECT de clase WHERE id = ?
              if (query.includes('FROM clase') && query.includes('WHERE id')) {
                const claseId = params && params.length > 0 ? Number(params[0]) : null;
                if (claseId !== null) {
                  const clase = mockData.clases.find((c: any) => Number(c.id) === claseId);
                  return clase ? { ...clase, activa: clase.activa ?? 1 } : null;
                }
                return null;
              }
              if (query.includes('FROM clase_desactivada') && query.includes('WHERE clase_id') && query.includes('fecha_clase')) {
                const claseId = params && params.length > 0 ? Number(params[0]) : null;
                const fechaClase = params && params.length > 1 ? String(params[1]) : null;
                if (claseId != null && fechaClase != null) {
                  const row = mockData.clase_desactivada.find(
                    (d: any) => Number(d.clase_id) === claseId && d.fecha_clase === fechaClase
                  );
                  return row ? { 1: 1 } : null;
                }
                return null;
              }
              if (query.includes('SELECT activa FROM clase WHERE id')) {
                const claseId = params && params.length > 0 ? Number(params[0]) : null;
                if (claseId !== null) {
                  const clase = mockData.clases.find((c: any) => Number(c.id) === claseId);
                  return clase ? { activa: clase.activa ?? 1 } : null;
                }
                return null;
              }
              
              if (query.includes('FROM usuario') && query.includes('id')) {
                const usuario = mockData.usuarios.find((u: any) => u.id === parseInt(params[0]));
                if (!usuario) return null;
                // Usar la función de normalización (definida en getMockData)
                const normalized = normalizeUsuario(usuario);
                return normalized;
              }
              // Manejar SELECT de reserva WHERE usuario_id y clase_id
              // Hacer la condición más específica para evitar falsos positivos
              // Verificar que sea exactamente "SELECT * FROM reserva WHERE usuario_id = ? AND clase_id = ?"
              if (query.includes('SELECT') &&
                  query.includes('FROM reserva') && 
                  query.includes('WHERE usuario_id') && 
                  query.includes('clase_id') &&
                  query.includes('AND') &&
                  params && params.length >= 2) {
                const usuarioId = Number(params[0]);
                const claseId = Number(params[1]);
                
                // Buscar la reserva comparando ambos IDs como números
                const reserva = mockData.reservas.find(
                  (r: any) => {
                    const rUsuarioId = Number(r.usuario_id);
                    const rClaseId = Number(r.clase_id);
                    return rUsuarioId === usuarioId && rClaseId === claseId;
                  }
                );
                // Retornar null explícitamente si no se encuentra (no undefined)
                return reserva || null;
              }
            }
            return null;
          },
          all: async () => {
            const mockData = getMockData();
            // Usuarios
            if (query.includes('FROM usuario')) {
              // Limpiar y normalizar datos existentes usando la función helper
              // Eliminar usuarios con dni (estructura antigua)
              let results = mockData.usuarios
                .filter((u: any) => {
                  // Eliminar usuarios con dni (estructura antigua completamente incompatible)
                  if (u && u.dni) {
                    return false;
                  }
                  return true;
                })
                .map((u: any) => normalizeUsuario(u))
                .filter((u: any) => u !== null);
              
              // Aplicar ORDER BY si existe en la query
              if (query.includes('ORDER BY')) {
                if (query.includes('ORDER BY apellido, nombre')) {
                  results.sort((a: any, b: any) => {
                    const apellidoCompare = (a.apellido || '').localeCompare(b.apellido || '');
                    if (apellidoCompare !== 0) return apellidoCompare;
                    return (a.nombre || '').localeCompare(b.nombre || '');
                  });
                }
              }
              
              return { results };
            }
            // Clases
            if (query.includes('FROM clase') && !query.includes('clase_desactivada')) {
              let results = [...mockData.clases].map((c: any) => ({ ...c, activa: c.activa ?? 1 }));
              
              // Aplicar ORDER BY si existe
              if (query.includes('ORDER BY dia, hora')) {
                const ordenDias: { [key: string]: number } = { 'Lun': 1, 'Mar': 2, 'Jue': 3, 'Sab': 4 };
                results.sort((a: any, b: any) => {
                  const diaA = ordenDias[a.dia] || 99;
                  const diaB = ordenDias[b.dia] || 99;
                  if (diaA !== diaB) return diaA - diaB;
                  return (a.hora || '').localeCompare(b.hora || '');
                });
              }
              
              return { results };
            }
            if (query.includes('FROM clase_desactivada')) {
              let results = [...(mockData.clase_desactivada || [])];
              if (query.includes('WHERE clase_id = ?') && params && params.length >= 1) {
                results = results.filter((d: any) => Number(d.clase_id) === Number(params[0]));
              }
              if (query.includes('fecha_clase = ?') && params && params.length >= 2) {
                const idx = query.indexOf('fecha_clase = ?');
                const paramIndex = (query.substring(0, idx).match(/\?/g) || []).length;
                if (paramIndex < params.length) {
                  const fecha = String(params[paramIndex]);
                  results = results.filter((d: any) => d.fecha_clase === fecha);
                }
              }
              if (query.includes('ORDER BY')) {
                results.sort((a: any, b: any) => {
                  const d = (a.fecha_clase || '').localeCompare(b.fecha_clase || '');
                  if (d !== 0) return d;
                  return Number(a.clase_id) - Number(b.clase_id);
                });
              }
              return { results };
            }
        // Reservas
        if (query.includes('FROM reserva')) {
          let results: any[] = [];
          
          // Si hay JOIN, construir resultados con datos relacionados
          if (query.includes('JOIN usuario') || query.includes('JOIN clase')) {
            // Filtrar solo reservas de usuarios activos si la query incluye WHERE u.activo = 1
            const soloActivos = query.includes('WHERE') && query.includes('activo') && (query.includes('= 1') || query.includes('u.activo = 1'));
            
            for (const reserva of mockData.reservas) {
              const usuario = mockData.usuarios.find((u: any) => u.id === reserva.usuario_id);
              const clase = mockData.clases.find((c: any) => c.id === reserva.clase_id);
              
              // Si solo queremos activos, filtrar usuarios desactivados
              if (soloActivos && usuario) {
                const usuarioNormalizado = normalizeUsuario(usuario);
                if (!usuarioNormalizado || !usuarioNormalizado.activo) {
                  continue;
                }
              }
              
              if (usuario && clase) {
                results.push({
                  ...reserva,
                  // Asegurar que fecha_clase y es_reasignacion estén siempre presentes
                  fecha_clase: reserva.fecha_clase !== undefined ? reserva.fecha_clase : null,
                  es_reasignacion: reserva.es_reasignacion !== undefined ? reserva.es_reasignacion : 0,
                  nombre: usuario.nombre,
                  apellido: usuario.apellido,
                  dia: clase.dia,
                  hora: clase.hora,
                  clase_nombre: clase.nombre
                });
              }
            }
            
            // Aplicar filtros adicionales si hay WHERE con parámetros
            if (query.includes('WHERE') && params.length > 0) {
              if (query.includes('r.usuario_id = ?') || query.includes('usuario_id = ?')) {
                const usuarioIdIndex = query.indexOf('usuario_id = ?');
                if (usuarioIdIndex !== -1) {
                  // Encontrar qué parámetro corresponde a usuario_id
                  const beforeUsuarioId = query.substring(0, usuarioIdIndex);
                  const paramIndex = (beforeUsuarioId.match(/\?/g) || []).length;
                  if (params[paramIndex] !== undefined) {
                    results = results.filter((r: any) => Number(r.usuario_id) === Number(params[paramIndex]));
                  }
                }
              }
              if (query.includes('r.clase_id = ?') || query.includes('clase_id = ?')) {
                const claseIdIndex = query.indexOf('clase_id = ?');
                if (claseIdIndex !== -1) {
                  const beforeClaseId = query.substring(0, claseIdIndex);
                  const paramIndex = (beforeClaseId.match(/\?/g) || []).length;
                  if (params[paramIndex] !== undefined) {
                    results = results.filter((r: any) => Number(r.clase_id) === Number(params[paramIndex]));
                  }
                }
              }
              
              // Filtrar por fecha_clase si está en la query
              if (query.includes('r.fecha_clase') || query.includes('fecha_clase = ?')) {
                const fechaClaseIndex = query.indexOf('fecha_clase = ?');
                if (fechaClaseIndex !== -1) {
                  const beforeFechaClase = query.substring(0, fechaClaseIndex);
                  const paramIndex = (beforeFechaClase.match(/\?/g) || []).length;
                  if (params[paramIndex] !== undefined) {
                    const fechaClaseValue = params[paramIndex];
                    results = results.filter((r: any) => {
                      if (!fechaClaseValue || fechaClaseValue === null || fechaClaseValue === 'null' || fechaClaseValue === '') {
                        // Si no hay fecha_clase, incluir solo reservas fijas (sin fecha_clase)
                        return !r.fecha_clase || r.fecha_clase === null || r.fecha_clase === 'null' || r.fecha_clase === '';
                      } else {
                        // Si hay fecha_clase, incluir reservas que coincidan con esa fecha
                        return r.fecha_clase === fechaClaseValue;
                      }
                    });
                  }
                }
                
                // También manejar: (r.fecha_clase IS NULL OR r.fecha_clase = ? OR ...)
                if (query.includes('fecha_clase IS NULL') || query.includes('fecha_clase = \'null\'')) {
                  // Esto significa que queremos reservas fijas (sin fecha_clase) O temporales para una fecha específica
                  const fechaClaseParam = params.find((p: any) => p && typeof p === 'string' && p.match(/^\d{4}-\d{2}-\d{2}$/));
                  if (fechaClaseParam) {
                    results = results.filter((r: any) => {
                      const sinFecha = !r.fecha_clase || r.fecha_clase === null || r.fecha_clase === 'null' || r.fecha_clase === '';
                      const coincideFecha = r.fecha_clase === fechaClaseParam;
                      return sinFecha || coincideFecha;
                    });
                  } else {
                    // Si no hay parámetro de fecha, solo mostrar fijas
                    results = results.filter((r: any) => !r.fecha_clase || r.fecha_clase === null || r.fecha_clase === 'null' || r.fecha_clase === '');
                  }
                }
              }
              
              // Filtrar por es_reasignacion si está en la query
              if (query.includes('es_reasignacion') && (query.includes('= ?') || query.includes('= 1') || query.includes('= 0'))) {
                if (query.includes('es_reasignacion = 1')) {
                  results = results.filter((r: any) => r.es_reasignacion === 1 || r.es_reasignacion === true);
                } else if (query.includes('es_reasignacion = 0') || query.includes('es_reasignacion IS NULL')) {
                  results = results.filter((r: any) => !r.es_reasignacion || r.es_reasignacion === 0);
                } else if (query.includes('es_reasignacion = ?')) {
                  const esReasignacionIndex = query.indexOf('es_reasignacion = ?');
                  if (esReasignacionIndex !== -1) {
                    const beforeEsReasignacion = query.substring(0, esReasignacionIndex);
                    const paramIndex = (beforeEsReasignacion.match(/\?/g) || []).length;
                    if (params[paramIndex] !== undefined) {
                      const esReasignacionValue = params[paramIndex] === 1 || params[paramIndex] === true;
                      results = results.filter((r: any) => {
                        const rEsReasignacion = r.es_reasignacion === 1 || r.es_reasignacion === true;
                        return rEsReasignacion === esReasignacionValue;
                      });
                    }
                  }
                }
              }
            }
          } else {
            // Si no hay JOIN, devolver reservas directamente pero asegurar que tengan fecha_clase y es_reasignacion
            results = mockData.reservas.map((r: any) => ({
              ...r,
              fecha_clase: r.fecha_clase !== undefined ? r.fecha_clase : null,
              es_reasignacion: r.es_reasignacion !== undefined ? r.es_reasignacion : 0
            }));
          }
              
              // Aplicar ORDER BY
              if (query.includes('ORDER BY')) {
                if (query.includes('ORDER BY c.dia, c.hora')) {
                  const ordenDias: { [key: string]: number } = { 'Lun': 1, 'Mar': 2, 'Jue': 3, 'Sab': 4 };
                  results.sort((a: any, b: any) => {
                    const diaA = ordenDias[a.dia] || 99;
                    const diaB = ordenDias[b.dia] || 99;
                    if (diaA !== diaB) return diaA - diaB;
                    return (a.hora || '').localeCompare(b.hora || '');
                  });
                }
              }
              
              return { results };
            }
            // Clase recuperar
            if (query.includes('FROM clase_recuperar')) {
              let results = [...mockData.clase_recuperar];
              
              // Aplicar filtros WHERE
              if (query.includes('WHERE') && params.length > 0) {
                if (query.includes('usuario_id = ?')) {
                  const usuarioIdIndex = query.indexOf('usuario_id = ?');
                  if (usuarioIdIndex !== -1) {
                    const beforeUsuarioId = query.substring(0, usuarioIdIndex);
                    const paramIndex = (beforeUsuarioId.match(/\?/g) || []).length;
                    if (params[paramIndex] !== undefined) {
                      results = results.filter((r: any) => Number(r.usuario_id) === Number(params[paramIndex]));
                    }
                  }
                }
                if (query.includes('usado = ?')) {
                  const usadoIndex = query.indexOf('usado = ?');
                  if (usadoIndex !== -1) {
                    const beforeUsado = query.substring(0, usadoIndex);
                    const paramIndex = (beforeUsado.match(/\?/g) || []).length;
                    if (params[paramIndex] !== undefined) {
                      results = results.filter((r: any) => Number(r.usado) === Number(params[paramIndex]));
                    }
                  }
                }
                if (query.includes('fecha_vencimiento >= date(\'now\')') || query.includes('fecha_vencimiento >=')) {
                  const hoy = new Date().toISOString().split('T')[0];
                  results = results.filter((r: any) => r.fecha_vencimiento >= hoy);
                }
              }
              
              // Manejar COUNT(*)
              if (query.includes('COUNT(*)')) {
                return { results: [{ total: results.length }] };
              }
              
              return { results };
            }
            return { results: [] };
          },
          run: async () => {
            const mockData = getMockData();
            try {
              if (query.includes('INSERT INTO usuario')) {
              // El orden de los parámetros es: nombre, apellido, telefono, fecha_alta, activo
              // según: INSERT INTO usuario (nombre, apellido, telefono, fecha_alta, activo) VALUES (?, ?, ?, ?, ?)
              
              // Generar ID autoincremental
              const maxId = mockData.usuarios.length > 0 
                ? Math.max(...mockData.usuarios.map((u: any) => (u.id || 0)))
                : 0;
              
              // Asegurar que tenemos al menos 3 parámetros (nombre, apellido, telefono)
              if (params.length < 3) {
                throw new Error('Faltan parámetros requeridos');
              }
              
              // Validar que los parámetros estén en el orden correcto
              const nombre = String(params[0] || '').trim();
              const apellido = String(params[1] || '').trim();
              const telefono = String(params[2] || '').trim();
              const fechaAlta = params[3] ? String(params[3]).trim() : new Date().toISOString().split('T')[0];
              const activo = params[4] !== undefined ? (params[4] === 1 || params[4] === true) : true;
              
              // Validar que los campos requeridos no estén vacíos
              if (!nombre || !apellido || !telefono) {
                throw new Error('Faltan campos requeridos');
              }
              
              // Crear usuario con estructura explícita y orden correcto
              const usuario: any = {};
              usuario.id = maxId + 1;
              usuario.nombre = nombre;
              usuario.apellido = apellido;
              usuario.telefono = telefono;
              usuario.fecha_alta = fechaAlta;
              // Asegurar que activo sea 1 (activo) por defecto
              usuario.activo = activo ? 1 : 0;
              
              // Limpiar datos corruptos del array
              mockData.usuarios = mockData.usuarios
                .map((u: any) => normalizeUsuario(u))
                .filter((u: any) => u !== null);
              
              // Agregar el usuario
              mockData.usuarios.push(usuario);
              
              // Devolver resultado similar a D1
              return {
                success: true,
                meta: {
                  last_row_id: usuario.id,
                  changes: 1
                }
              };
            }
            if (query.includes('INSERT INTO clase')) {
              // Generar ID autoincremental
              const maxId = mockData.clases.length > 0 
                ? Math.max(...mockData.clases.map((c: any) => c.id || 0))
                : 0;
              const clase = {
                id: maxId + 1,
                dia: params[0],
                hora: params[1],
                nombre: params[2] || 'Yoga',
                activa: 1
              };
              // Verificar si ya existe (dia + hora único)
              const exists = mockData.clases.findIndex(
                (c: any) => c.dia === clase.dia && c.hora === clase.hora
              );
              if (exists === -1) {
                mockData.clases.push(clase);
                return {
                  success: true,
                  meta: {
                    last_row_id: clase.id,
                    changes: 1
                  }
                };
              } else {
                throw new Error('UNIQUE constraint failed: clase.dia, clase.hora');
              }
            }
            if (query.includes('INSERT INTO clase_recuperar')) {
              // INSERT INTO clase_recuperar (usuario_id, fecha_creacion, fecha_vencimiento, clase_id, fecha_clase_cancelada, usado)
              // VALUES (?, ?, ?, ?, ?, 0)
              const maxId = mockData.clase_recuperar.length > 0 
                ? Math.max(...mockData.clase_recuperar.map((c: any) => (c.id || 0)))
                : 0;
              
              const claseRecuperar: any = {
                id: maxId + 1,
                usuario_id: Number(params[0]),
                fecha_creacion: String(params[1]),
                fecha_vencimiento: String(params[2]),
                clase_id: params[3] !== undefined && params[3] !== null ? Number(params[3]) : null,
                fecha_clase_cancelada: params[4] !== undefined && params[4] !== null ? String(params[4]) : null,
                usado: params[5] !== undefined ? Number(params[5]) : 0,
                fecha_uso: null,
                created_at: new Date().toISOString()
              };
              
              mockData.clase_recuperar.push(claseRecuperar);
              
              return {
                success: true,
                meta: {
                  last_row_id: claseRecuperar.id,
                  changes: 1
                }
              };
            }
            if (query.includes('INSERT INTO clase_desactivada')) {
              const claseId = Number(params[0]);
              const fechaClase = String(params[1] || '');
              const exists = (mockData.clase_desactivada || []).some(
                (d: any) => Number(d.clase_id) === claseId && d.fecha_clase === fechaClase
              );
              if (exists) throw new Error('UNIQUE constraint failed');
              if (!mockData.clase_desactivada) mockData.clase_desactivada = [];
              mockData.clase_desactivada.push({ clase_id: claseId, fecha_clase: fechaClase });
              return { success: true, meta: { changes: 1 } };
            }
            if (query.includes('INSERT INTO reserva')) {
              // Detectar qué campos vienen en el INSERT
              // Puede ser:
              // 1. INSERT INTO reserva (usuario_id, clase_id) VALUES (?, ?)
              // 2. INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at) VALUES (?, ?, ?, 1, datetime('now'))
              // 3. INSERT INTO reserva (usuario_id, clase_id, created_at) VALUES (?, ?, ?)
              
              let reserva: any = {
                usuario_id: Number(params[0]),
                clase_id: Number(params[1])
              };
              
              // Si hay fecha_clase (param[2]) y es_reasignacion (param[3]), es una reserva temporal
              if (params.length >= 3 && params[2] !== undefined && params[2] !== null && params[2] !== '') {
                reserva.fecha_clase = params[2];
                reserva.es_reasignacion = params.length >= 4 ? (params[3] === 1 || params[3] === true ? 1 : 0) : 0;
              } else {
                // Reserva fija: sin fecha_clase y sin es_reasignacion (o 0)
                reserva.fecha_clase = null;
                reserva.es_reasignacion = 0;
              }
              
              // created_at puede venir como último parámetro o generarse automáticamente
              if (query.includes('datetime(\'now\')')) {
                reserva.created_at = new Date().toISOString();
              } else if (params.length >= 3 && params[params.length - 1] && !reserva.fecha_clase) {
                reserva.created_at = params[params.length - 1];
              } else if (params.length >= 4 && params[params.length - 1]) {
                reserva.created_at = params[params.length - 1];
              } else {
                reserva.created_at = new Date().toISOString();
              }
              
              // Verificar que el usuario existe y está activo
              const usuario = mockData.usuarios.find((u: any) => Number(u.id) === reserva.usuario_id);
              if (!usuario) {
                const error: any = new Error('El alumno no existe');
                error.code = 'USUARIO_NO_EXISTE';
                throw error;
              }
              
              const usuarioActivo = usuario.activo === true || usuario.activo === 1;
              if (!usuarioActivo) {
                const error: any = new Error('No se pueden inscribir alumnos desactivados a clases');
                error.code = 'USUARIO_DESACTIVADO';
                throw error;
              }
              
              // Para reservas fijas, verificar si ya existe (usuario_id + clase_id único)
              // Para reservas temporales, verificar si ya existe (usuario_id + clase_id + fecha_clase único)
              let exists = -1;
              if (reserva.fecha_clase && reserva.es_reasignacion === 1) {
                // Reserva temporal: puede haber múltiples reservas del mismo usuario/clase en fechas diferentes
                exists = mockData.reservas.findIndex(
                  (r: any) => 
                    Number(r.usuario_id) === reserva.usuario_id && 
                    Number(r.clase_id) === reserva.clase_id &&
                    r.fecha_clase === reserva.fecha_clase &&
                    (r.es_reasignacion === 1 || r.es_reasignacion === true)
                );
              } else {
                // Reserva fija: no puede haber duplicados (usuario_id + clase_id único)
                exists = mockData.reservas.findIndex(
                  (r: any) => 
                    Number(r.usuario_id) === reserva.usuario_id && 
                    Number(r.clase_id) === reserva.clase_id &&
                    (!r.fecha_clase || r.fecha_clase === null || r.fecha_clase === 'null' || r.fecha_clase === '') &&
                    (!r.es_reasignacion || r.es_reasignacion === 0)
                );
                
                // También verificar que no haya una reserva temporal para el mismo usuario/clase en la misma fecha
                // (esto se maneja en el endpoint, pero lo verificamos aquí también)
              }
              
              if (exists !== -1) {
                if (reserva.fecha_clase) {
                  throw new Error('Ya existe una reserva temporal para este usuario en esta clase y fecha');
                } else {
                  throw new Error('UNIQUE constraint failed: reserva.usuario_id, reserva.clase_id');
                }
              }
              
              // Verificar el cupo máximo (35 alumnos por clase)
              // Para reservas fijas: contar todas las reservas fijas
              // Para reservas temporales: contar fijas + temporales para esa fecha específica
              const MAX_CUPO = 35;
              let reservasClase: any[] = [];
              
              if (reserva.fecha_clase && reserva.es_reasignacion === 1) {
                // Reserva temporal: contar fijas + temporales para esta fecha
                reservasClase = mockData.reservas.filter((r: any) => {
                  if (Number(r.clase_id) !== reserva.clase_id) return false;
                  
                  // Contar reservas fijas
                  const esFija = !r.fecha_clase || r.fecha_clase === null || r.fecha_clase === 'null' || r.fecha_clase === '';
                  if (esFija && (!r.es_reasignacion || r.es_reasignacion === 0)) return true;
                  
                  // Contar reservas temporales para esta fecha
                  const esTemporal = r.fecha_clase && r.fecha_clase === reserva.fecha_clase && (r.es_reasignacion === 1 || r.es_reasignacion === true);
                  return esTemporal;
                });
              } else {
                // Reserva fija: contar solo reservas fijas
                reservasClase = mockData.reservas.filter(
                  (r: any) => Number(r.clase_id) === reserva.clase_id && 
                  (!r.fecha_clase || r.fecha_clase === null || r.fecha_clase === 'null' || r.fecha_clase === '') &&
                  (!r.es_reasignacion || r.es_reasignacion === 0)
                );
              }
              
              if (reservasClase.length >= MAX_CUPO) {
                const error: any = new Error(`Esta clase ya tiene el cupo completo (${MAX_CUPO} alumnos). No se pueden inscribir más alumnos.`);
                error.code = 'CUPO_COMPLETO';
                error.cupoMaximo = MAX_CUPO;
                error.cupoActual = reservasClase.length;
                throw error;
              }
              
              mockData.reservas.push(reserva);
              return {
                success: true,
                meta: {
                  changes: 1
                }
              };
            }
            if (query.includes('UPDATE usuario')) {
              // Caso 1: UPDATE usuario SET activo = ? WHERE id = ?
              if (query.includes('SET activo = ?') && query.includes('WHERE id = ?')) {
                const activo = params[0] === 1 || params[0] === true;
                const id = params[1];
                const index = mockData.usuarios.findIndex((u: any) => Number(u.id) === Number(id));
                if (index !== -1) {
                  mockData.usuarios[index].activo = activo ? 1 : 0;
                  return {
                    success: true,
                    meta: {
                      changes: 1
                    }
                  };
                }
                return {
                  success: true,
                  meta: {
                    changes: 0
                  }
                };
              }
              
              // Caso 2: UPDATE completo con todos los campos
              // Orden: nombre, apellido, telefono, fecha_alta, activo, id
              if (params.length >= 6) {
                const id = params[5]; // último parámetro es el ID
                const index = mockData.usuarios.findIndex((u: any) => Number(u.id) === Number(id));
                if (index !== -1) {
                  const activo = params[4] !== undefined ? (params[4] === 1 || params[4] === true) : true;
                  mockData.usuarios[index] = {
                    ...mockData.usuarios[index],
                    nombre: params[0],
                    apellido: params[1],
                    telefono: params[2],
                    fecha_alta: params[3],
                    activo: activo ? 1 : 0
                  };
                  return {
                    success: true,
                    meta: {
                      changes: 1
                    }
                  };
                }
              }
              
              return {
                success: true,
                meta: {
                  changes: 0
                }
              };
            }
            if (query.includes('UPDATE clase') && query.includes('activa')) {
              const id = params[params.length - 1];
              const activa = params[0];
              const c = mockData.clases.find((x: any) => Number(x.id) === Number(id));
              if (c) {
                c.activa = activa;
                return { success: true, meta: { changes: 1 } };
              }
              return { success: true, meta: { changes: 0 } };
            }
            if (query.includes('UPDATE reserva')) {
              // Similar para reservas
            }
            if (query.includes('DELETE FROM usuario')) {
              const beforeCount = mockData.usuarios.length;
              mockData.usuarios = mockData.usuarios.filter((u: any) => u.id !== parseInt(params[0]));
              const changes = beforeCount - mockData.usuarios.length;
              return {
                success: true,
                meta: {
                  changes: changes
                }
              };
            }
            if (query.includes('DELETE FROM clase')) {
              mockData.clases = mockData.clases.filter((c: any) => c.id !== parseInt(params[0]));
            }
            if (query.includes('DELETE FROM clase_desactivada')) {
              const claseId = Number(params[0]);
              const fechaClase = String(params[1] || '');
              const before = (mockData.clase_desactivada || []).length;
              mockData.clase_desactivada = (mockData.clase_desactivada || []).filter(
                (d: any) => !(Number(d.clase_id) === claseId && d.fecha_clase === fechaClase)
              );
              const changes = before - (mockData.clase_desactivada || []).length;
              return { success: true, meta: { changes } };
            }
            if (query.includes('DELETE FROM reserva')) {
              const beforeCount = mockData.reservas.length;
              mockData.reservas = mockData.reservas.filter(
                (r: any) => !(r.usuario_id === parseInt(params[0]) && r.clase_id === parseInt(params[1]))
              );
              const changes = beforeCount - mockData.reservas.length;
              return {
                success: true,
                meta: {
                  changes: changes
                }
              };
            }
            
            // Return por defecto si no se ejecutó ninguna operación
            return {
              success: true,
              meta: {
                changes: 0
              }
            };
          } catch (error) {
            throw error;
          }
          }
        };
      },
      first: async () => {
        const mockData = getMockData();
        
        // Manejar COUNT(*) queries (sin parámetros)
        if (query.includes('SELECT COUNT(*)')) {
          if (query.includes('FROM clase')) {
            // COUNT de clases
            return { count: mockData.clases.length };
          }
          if (query.includes('FROM usuario')) {
            // COUNT de usuarios
            return { count: mockData.usuarios.length };
          }
          if (query.includes('FROM reserva') && !query.includes('WHERE')) {
            // COUNT de reservas (sin WHERE)
            return { count: mockData.reservas.length };
          }
        }
        
        if (query.includes('SELECT') && query.includes('WHERE')) {
          if (query.includes('usuario') && query.includes('id')) {
            // Sin bind, no podemos obtener el parámetro
            return null;
          }
        }
        return null;
      },
      all: async () => {
        const mockData = getMockData();
        // Usuarios
        if (query.includes('FROM usuario')) {
          // Los datos ya están normalizados en getMockData(), solo filtrar
          // Eliminar usuarios con dni (estructura antigua)
          let results = mockData.usuarios
            .filter((u: any) => {
              // Eliminar usuarios con dni (estructura antigua completamente incompatible)
              if (u && u.dni) {
                return false;
              }
              return true;
            })
            .map((u: any) => normalizeUsuario(u))
            .filter((u: any) => u !== null);
          
          // Aplicar ORDER BY si existe en la query
          if (query.includes('ORDER BY')) {
            if (query.includes('ORDER BY apellido, nombre')) {
              results.sort((a: any, b: any) => {
                const apellidoCompare = (a.apellido || '').localeCompare(b.apellido || '');
                if (apellidoCompare !== 0) return apellidoCompare;
                return (a.nombre || '').localeCompare(b.nombre || '');
              });
            }
          }
          
          return { results };
        }
        // Clases
        if (query.includes('FROM clase')) {
          let results = [...mockData.clases];
          
          // Aplicar ORDER BY si existe
          if (query.includes('ORDER BY dia, hora')) {
            const ordenDias: { [key: string]: number } = { 'Lun': 1, 'Mar': 2, 'Jue': 3, 'Sab': 4 };
            results.sort((a, b) => {
              const diaA = ordenDias[a.dia] || 99;
              const diaB = ordenDias[b.dia] || 99;
              if (diaA !== diaB) return diaA - diaB;
              return (a.hora || '').localeCompare(b.hora || '');
            });
          }
          
          return { results };
        }
        // Reservas (segunda sección - método all sin bind)
        if (query.includes('FROM reserva')) {
          let results: any[] = [];
          
          // Si hay JOIN, construir resultados con datos relacionados
          if (query.includes('JOIN usuario') || query.includes('JOIN clase')) {
            // Filtrar solo reservas de usuarios activos si la query incluye WHERE u.activo = 1
            const soloActivos = query.includes('WHERE') && query.includes('activo') && query.includes('= 1');
            
            for (const reserva of mockData.reservas) {
              const usuario = mockData.usuarios.find((u: any) => u.id === reserva.usuario_id);
              const clase = mockData.clases.find((c: any) => c.id === reserva.clase_id);
              
              // Si solo queremos activos, filtrar usuarios desactivados
              if (soloActivos && usuario && (!usuario.activo || usuario.activo === 0)) {
                continue;
              }
              
              if (usuario && clase) {
                results.push({
                  ...reserva,
                  nombre: usuario.nombre,
                  apellido: usuario.apellido,
                  dia: clase.dia,
                  hora: clase.hora,
                  clase_nombre: clase.nombre
                });
              }
            }
          } else {
            results = [...mockData.reservas];
          }
          
          return { results };
        }
            return { results: [] };
      },
      run: async () => {
        const mockData = getMockData();
        // Similar lógica que en bind().run()
        if (query.includes('INSERT INTO usuario')) {
          // Sin bind, no podemos obtener los parámetros
          // Esto no debería ocurrir en uso normal
        }
      }
    };
  }
}

// Instancia singleton del MockDB usando globalThis
export function getMockDBInstance(): MockDB {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any).__mockDBInstance) {
      (globalThis as any).__mockDBInstance = new MockDB();
    }
    return (globalThis as any).__mockDBInstance;
  }
  // Fallback
  if (!(global as any).__mockDBInstance) {
    (global as any).__mockDBInstance = new MockDB();
  }
  return (global as any).__mockDBInstance;
}

export default MockDB;

