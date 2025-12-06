// Función helper para validar y normalizar un usuario
function normalizeUsuario(u: any) {
  if (!u || !u.id) return null;
  
  // Eliminar completamente si tiene dni (estructura antigua)
  if (u.dni) {
    return null;
  }
  
  const emailStr = String(u.email || '').trim();
  const apellidoStr = String(u.apellido || '').trim();
  const nombreStr = String(u.nombre || '').trim();
  
  // Validar que no sean datos corruptos
  const emailEsFecha = /^\d{4}-\d{2}-\d{2}$/.test(emailStr);
  const apellidoEsEmail = apellidoStr.includes('@');
  const nombreEsEmail = nombreStr.includes('@');
  const emailEsValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  
  if (emailEsFecha || apellidoEsEmail || nombreEsEmail || !emailEsValido || !nombreStr || !apellidoStr || !emailStr) {
    return null;
  }
  
  // Reconstruir en orden correcto, SOLO con los campos correctos (sin dni)
  const usuarioNormalizado: any = {};
  usuarioNormalizado.id = Number(u.id);
  usuarioNormalizado.nombre = nombreStr;
  usuarioNormalizado.apellido = apellidoStr;
  usuarioNormalizado.email = emailStr.toLowerCase();
  usuarioNormalizado.fecha_alta = u.fecha_alta ? String(u.fecha_alta).trim() : new Date().toISOString().split('T')[0];
  
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
  
  // Eliminar duplicados por email (mantener el primero)
  const emailsVistos = new Set<string>();
  mockData.usuarios = usuariosNormalizados.filter((u: any) => {
    if (!u || !u.email) return false;
    const emailKey = String(u.email).toLowerCase().trim();
    if (emailsVistos.has(emailKey)) {
      return false; // Duplicado, eliminar
    }
    emailsVistos.add(emailKey);
    return true;
  });
  
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
            if (query.includes('SELECT') && query.includes('WHERE')) {
              if (query.includes('usuario') && query.includes('id')) {
                const usuario = mockData.usuarios.find((u: any) => u.id === parseInt(params[0]));
                if (!usuario) return null;
                // Usar la función de normalización (definida en getMockData)
                const normalized = normalizeUsuario(usuario);
                return normalized;
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
                for (const reserva of mockData.reservas) {
                  const usuario = mockData.usuarios.find((u: any) => u.id === reserva.usuario_id);
                  const clase = mockData.clases.find((c: any) => c.id === reserva.clase_id);
                  
                  if (usuario && clase) {
                    results.push({
                      ...reserva,
                      nombre: usuario.nombre,
                      apellido: usuario.apellido,
                      email: usuario.email,
                      dia: clase.dia,
                      hora: clase.hora,
                      clase_nombre: clase.nombre
                    });
                  }
                }
              } else {
                results = [...mockData.reservas];
              }
              
              // Aplicar filtros si hay WHERE
              if (query.includes('WHERE')) {
                if (params.length > 0) {
                  if (query.includes('r.usuario_id = ?')) {
                    results = results.filter((r: any) => r.usuario_id === parseInt(params[0]));
                  }
                  if (query.includes('r.clase_id = ?')) {
                    results = results.filter((r: any) => r.clase_id === parseInt(params[0]));
                  }
                }
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
              // El orden de los parámetros es: nombre, apellido, email, telefono, fecha_alta
              // según: INSERT INTO usuario (nombre, apellido, email, telefono, fecha_alta) VALUES (?, ?, ?, ?, ?)
              
              // Generar ID autoincremental
              const maxId = mockData.usuarios.length > 0 
                ? Math.max(...mockData.usuarios.map((u: any) => (u.id || 0)))
                : 0;
              
              // Debug: verificar parámetros recibidos
              console.log('INSERT usuario - Parámetros recibidos:', params);
              console.log('INSERT usuario - Número de parámetros:', params.length);
              
              // Asegurar que tenemos al menos 4 parámetros (nombre, apellido, email, telefono)
              if (params.length < 4) {
                throw new Error('Faltan parámetros requeridos');
              }
              
              // Validar que los parámetros estén en el orden correcto
              const nombre = String(params[0] || '').trim();
              const apellido = String(params[1] || '').trim();
              const email = String(params[2] || '').toLowerCase().trim();
              const telefono = String(params[3] || '').trim();
              const fechaAlta = params[4] ? String(params[4]).trim() : new Date().toISOString().split('T')[0];
              
              // Debug: verificar valores extraídos
              console.log('INSERT usuario - Valores extraídos:', { nombre, apellido, email, telefono, fechaAlta });
              
              // Validar que nombre y apellido no sean emails
              if (nombre.includes('@')) {
                console.error('ERROR: nombre contiene @, esto indica que los parámetros están desordenados');
                throw new Error('Error: el nombre no puede ser un email. Verifique el orden de los campos.');
              }
              if (apellido.includes('@') && !email.includes('@')) {
                console.error('ERROR: apellido contiene @ pero email no, esto indica que los parámetros están desordenados');
                throw new Error('Error: el apellido no puede ser un email. Verifique el orden de los campos.');
              }
              
              // Validar que los campos requeridos no estén vacíos
              if (!nombre || !apellido || !email || !telefono) {
                throw new Error('Faltan campos requeridos');
              }
              
              // Validar formato de email
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(email)) {
                throw new Error('Email inválido');
              }
              
              // Validar que el email no sea una fecha
              if (/^\d{4}-\d{2}-\d{2}$/.test(email)) {
                throw new Error('Email inválido');
              }
              
              // Crear usuario con estructura explícita y orden correcto
              // Asegurarse de que solo tenga los campos correctos (sin dni u otros campos extra)
              // Crear objeto completamente nuevo sin ningún campo extra
              const usuario: any = {};
              usuario.id = maxId + 1;
              usuario.nombre = nombre;
              usuario.apellido = apellido;
              usuario.email = email;
              usuario.telefono = telefono;
              usuario.fecha_alta = fechaAlta;
              // NO incluir ningún otro campo (especialmente dni)
              
              // Debug: verificar usuario creado
              console.log('INSERT usuario - Usuario creado:', usuario);
              
              // Validar que el usuario tenga la estructura correcta antes de guardarlo
              if (!usuario.id || !usuario.nombre || !usuario.apellido || !usuario.email || !usuario.telefono) {
                throw new Error('Error al crear usuario: estructura inválida');
              }
              
              // Validar que nombre y apellido no sean emails
              if (usuario.nombre.includes('@')) {
                throw new Error('Error: el nombre contiene un email. Los parámetros pueden estar en el orden incorrecto.');
              }
              if (usuario.apellido.includes('@')) {
                throw new Error('Error: el apellido contiene un email. Los parámetros pueden estar en el orden incorrecto.');
              }
              
              // Limpiar datos corruptos del array antes de verificar duplicados
              mockData.usuarios = mockData.usuarios
                .filter((u: any) => {
                  if (!u || !u.id || !u.email || !u.nombre || !u.apellido) return false;
                  const emailStr = String(u.email || '');
                  const apellidoStr = String(u.apellido || '');
                  const nombreStr = String(u.nombre || '');
                  // Eliminar si el email es una fecha, o si apellido/nombre contiene @
                  if (/^\d{4}-\d{2}-\d{2}$/.test(emailStr)) return false;
                  if (apellidoStr.includes('@') || nombreStr.includes('@')) return false;
                  // Verificar que el email sea válido
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) return false;
                  return true;
                })
                .map((u: any) => normalizeUsuario(u))
                .filter((u: any) => u !== null);
              
              // Asegurarse de que los usuarios estén normalizados antes de verificar duplicados
              // Esto es importante porque getMockData() normaliza, pero necesitamos asegurarnos aquí también
              const usuariosNormalizados = mockData.usuarios
                .map((u: any) => normalizeUsuario(u))
                .filter((u: any) => u !== null);
              
              // Verificar si el email ya existe (case-insensitive, normalizado)
              const emailNormalizado = usuario.email.toLowerCase().trim();
              
              // Buscar duplicados normalizando todos los emails existentes
              const exists = usuariosNormalizados.findIndex((u: any) => {
                if (!u || !u.email) return false;
                const emailExistente = String(u.email).toLowerCase().trim();
                return emailExistente === emailNormalizado;
              });
              
              if (exists === -1) {
              // Actualizar el array con usuarios normalizados y agregar el nuevo
              // Asegurarse de que el usuario solo tenga los campos correctos (sin dni u otros campos extra)
              // Crear un objeto completamente nuevo sin ningún campo extra
              const usuarioLimpio: any = {};
              usuarioLimpio.id = usuario.id;
              usuarioLimpio.nombre = usuario.nombre;
              usuarioLimpio.apellido = usuario.apellido;
              usuarioLimpio.email = usuario.email;
              usuarioLimpio.fecha_alta = usuario.fecha_alta;
              // NO incluir ningún otro campo (especialmente dni)
                
                // Debug: verificar usuario limpio antes de guardar
                console.log('INSERT usuario - Usuario limpio a guardar:', usuarioLimpio);
                
                mockData.usuarios = usuariosNormalizados;
                mockData.usuarios.push(usuarioLimpio);
                
                // Debug: verificar que se guardó correctamente
                console.log('INSERT usuario - Usuario guardado en array:', mockData.usuarios[mockData.usuarios.length - 1]);
                
                // Devolver resultado similar a D1
                return {
                  success: true,
                  meta: {
                    last_row_id: usuario.id,
                    changes: 1
                  }
                };
              } else {
                throw new Error('UNIQUE constraint failed: usuario.email');
              }
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
              const reserva = {
                usuario_id: params[0],
                clase_id: params[1],
                created_at: new Date().toISOString()
              };
              // Verificar si ya existe
              const exists = mockData.reservas.findIndex(
                (r: any) => r.usuario_id === reserva.usuario_id && r.clase_id === reserva.clase_id
              );
              if (exists === -1) {
                mockData.reservas.push(reserva);
                return {
                  success: true,
                  meta: {
                    changes: 1
                  }
                };
              } else {
                throw new Error('UNIQUE constraint failed: reserva.usuario_id, reserva.clase_id');
              }
            }
            if (query.includes('UPDATE usuario')) {
              const id = params[4]; // último parámetro es el ID
              const index = mockData.usuarios.findIndex((u: any) => u.id === id);
              if (index !== -1) {
                const nuevoEmail = params[2]?.toLowerCase().trim() || params[2];
                // Verificar si el email ya existe en otro usuario (no el que se está editando)
                const emailExiste = mockData.usuarios.findIndex(
                  (u: any, i: number) => i !== index && u.email?.toLowerCase().trim() === nuevoEmail
                );
                if (emailExiste === -1) {
                  mockData.usuarios[index] = {
                    ...mockData.usuarios[index],
                    nombre: params[0],
                    apellido: params[1],
                    email: nuevoEmail,
                    fecha_alta: params[3]
                  };
                  return {
                    success: true,
                    meta: {
                      changes: 1
                    }
                  };
                } else {
                  throw new Error('UNIQUE constraint failed: usuario.email');
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
        // Reservas
        if (query.includes('FROM reserva')) {
          let results: any[] = [];
          
          // Si hay JOIN, construir resultados con datos relacionados
          if (query.includes('JOIN usuario') || query.includes('JOIN clase')) {
            for (const reserva of mockData.reservas) {
              const usuario = mockData.usuarios.find((u: any) => u.id === reserva.usuario_id);
              const clase = mockData.clases.find((c: any) => c.id === reserva.clase_id);
              
              if (usuario && clase) {
                results.push({
                  ...reserva,
                  nombre: usuario.nombre,
                  apellido: usuario.apellido,
                  email: usuario.email,
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

