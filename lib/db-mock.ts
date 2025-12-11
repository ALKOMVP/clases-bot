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
  usuarioNormalizado.activo = u.activo !== undefined ? (u.activo === 1 || u.activo === true) : true;
  
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
        reservas: []
      };
    }
    mockData = (globalThis as any).__mockDBData;
  } else {
    if (!(global as any).__mockDBData) {
      (global as any).__mockDBData = {
        usuarios: [],
        clases: [],
        reservas: []
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
            if (query.includes('SELECT COUNT(*)')) {
              if (query.includes('FROM reserva') && query.includes('WHERE clase_id')) {
                // COUNT de reservas por clase_id
                const claseId = params && params.length > 0 ? parseInt(params[0]) : null;
                if (claseId !== null) {
                  const count = mockData.reservas.filter((r: any) => r.clase_id === claseId).length;
                  return { count };
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
                // COUNT de reservas
                return { count: mockData.reservas.length };
              }
            }
            
            if (query.includes('SELECT') && query.includes('WHERE')) {
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
            if (query.includes('FROM clase')) {
              let results = [...mockData.clases];
              
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
            }
          } else {
            results = [...mockData.reservas];
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
              usuario.activo = activo;
              
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
                nombre: params[2] || 'Yoga'
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
            if (query.includes('INSERT INTO reserva')) {
              // Asegurar que los IDs sean números
              const reserva = {
                usuario_id: Number(params[0]),
                clase_id: Number(params[1]),
                created_at: params[2] || new Date().toISOString()
              };
              
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
              
              // Verificar si ya existe (comparando como números)
              const exists = mockData.reservas.findIndex(
                (r: any) => Number(r.usuario_id) === reserva.usuario_id && Number(r.clase_id) === reserva.clase_id
              );
              if (exists !== -1) {
                throw new Error('UNIQUE constraint failed: reserva.usuario_id, reserva.clase_id');
              }
              
              // Verificar el cupo máximo (35 alumnos por clase)
              const MAX_CUPO = 35;
              const reservasClase = mockData.reservas.filter(
                (r: any) => Number(r.clase_id) === reserva.clase_id
              );
              
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
            if (query.includes('UPDATE clase')) {
              // Similar para clases
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

