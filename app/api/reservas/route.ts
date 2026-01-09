import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, checkDatabaseAvailability, getEnvironmentInfo } from '@/lib/error-handler';

// OpenNext no requiere runtime = 'edge' explícito

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/reservas] Starting request', { environment: envInfo.environment });
  
  try {
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    // Primero intentar desde el contexto de Cloudflare (AsyncLocalStorage)
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[GET /api/reservas] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Si no está disponible en el contexto, intentar desde process.env (OpenNext lo popula)
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[GET /api/reservas] DB obtained from process.env.DB (OpenNext fallback)');
    }
    
    if (!db) {
      // Si no hay DB disponible, usar mock como fallback
      db = getMockDBInstance();
      console.log('[GET /api/reservas] Using mock DB as fallback');
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');
    const clase_id = searchParams.get('clase_id');

    const fecha_clase = searchParams.get('fecha_clase');
    const include_reasignaciones = searchParams.get('include_reasignaciones') === 'true';

    let query = `
      SELECT r.*, u.nombre, u.apellido, u.telefono, c.dia, c.hora, c.nombre as clase_nombre
      FROM reserva r
      JOIN usuario u ON r.usuario_id = u.id
      JOIN clase c ON r.clase_id = c.id
      WHERE u.activo = 1
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (usuario_id) {
      conditions.push('r.usuario_id = ?');
      params.push(usuario_id);
    }
    if (clase_id) {
      conditions.push('r.clase_id = ?');
      params.push(clase_id);
    }
    if (fecha_clase) {
      // Si se especifica fecha_clase, incluir:
      // 1. Reservas fijas (sin fecha_clase) EXCEPTO las que tienen cancelación para esta fecha
      // 2. Reservas temporales para esa fecha específica
      conditions.push('(r.fecha_clase IS NULL OR r.fecha_clase = \'null\' OR r.fecha_clase = \'\' OR r.fecha_clase = ?)');
      params.push(fecha_clase);
      
      // EXCLUIR reservas fijas que tienen cancelación para esta fecha específica
      // Solo aplicar esto a reservas fijas (sin fecha_clase y sin es_reasignacion)
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM cancelacion c
        WHERE c.usuario_id = r.usuario_id 
          AND c.clase_id = r.clase_id 
          AND c.fecha_clase = ?
          AND (r.fecha_clase IS NULL OR r.fecha_clase = 'null' OR r.fecha_clase = '')
          AND (r.es_reasignacion IS NULL OR r.es_reasignacion = 0 OR r.es_reasignacion = '0')
      )`);
      params.push(fecha_clase);
    } else if (!include_reasignaciones) {
      // Si no se incluyen reasignaciones, solo mostrar reservas fijas
      conditions.push('(r.fecha_clase IS NULL OR r.fecha_clase = \'null\' OR r.fecha_clase = \'\' OR r.es_reasignacion = 0 OR r.es_reasignacion IS NULL)');
    }
    
    // Si include_reasignaciones es true y no hay fecha_clase, mostrar todas las reservas (fijas y temporales)

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    // Ordenar por día y hora
    const ordenDias: { [key: string]: number } = { 'Lun': 1, 'Mar': 2, 'Jue': 3, 'Sab': 4 };
    query += ' ORDER BY c.dia, c.hora, u.apellido, u.nombre';

    let reservas: any[] = [];
    try {
      const stmt = db.prepare(query);
      const result = params.length > 0 
        ? await stmt.bind(...params).all()
        : await stmt.all();
      
      reservas = (result.results || []) as any[];
    } catch (error: any) {
      console.error('[GET /api/reservas] Error ejecutando query:', error);
      // Si hay error, retornar array vacío en lugar de fallar
      reservas = [];
    }
    
    // Ordenar manualmente por día
    reservas.sort((a, b) => {
      const diaA = ordenDias[a.dia] || 99;
      const diaB = ordenDias[b.dia] || 99;
      if (diaA !== diaB) return diaA - diaB;
      return a.hora.localeCompare(b.hora);
    });

    console.log('[GET /api/reservas] Success', { count: reservas.length });
    return NextResponse.json(reservas);
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al obtener reservas',
      { route: '/api/reservas', method: 'GET', operation: 'fetch_reservas' }
    );
  }
}

export async function POST(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[POST /api/reservas] Starting request', { environment: envInfo.environment });
  
  try {
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[POST /api/reservas] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Solo usar mock DB si NO hay DB real disponible Y estamos en desarrollo
    if (!db) {
      const isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        db = getMockDBInstance();
        console.log('[POST /api/reservas] Using mock DB (development only)');
      } else {
        console.error('[POST /api/reservas] DB not available in production');
        return NextResponse.json({ 
          error: 'Base de datos no disponible',
          details: 'El binding de D1 no está configurado correctamente'
        }, { status: 503 });
      }
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { usuario_id, clase_id } = await request.json();

    if (!usuario_id || !clase_id) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Verificar que el usuario existe y está activo
    const usuario = await db.prepare('SELECT id, activo FROM usuario WHERE id = ?').bind(usuario_id).first();
    
    if (!usuario) {
      return NextResponse.json({ 
        error: 'El alumno no existe',
        code: 'USUARIO_NO_EXISTE'
      }, { status: 400 });
    }

    if (!(usuario as any).activo || (usuario as any).activo === 0) {
      return NextResponse.json({ 
        error: 'No se pueden inscribir alumnos desactivados a clases',
        code: 'USUARIO_DESACTIVADO'
      }, { status: 400 });
    }

    // Verificar si el usuario ya está inscrito en esta clase
    const existingReserva = await db.prepare(
      'SELECT * FROM reserva WHERE usuario_id = ? AND clase_id = ?'
    ).bind(usuario_id, clase_id).first();

    if (existingReserva) {
      return NextResponse.json({ 
        error: 'El alumno ya está inscrito en esta clase',
        code: 'ALREADY_ENROLLED'
      }, { status: 400 });
    }

    await db.prepare(
      'INSERT INTO reserva (usuario_id, clase_id) VALUES (?, ?)'
    ).bind(usuario_id, clase_id).run();

    console.log('[POST /api/reservas] Success', { usuario_id, clase_id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al crear reserva',
      { route: '/api/reservas', method: 'POST', operation: 'create_reserva' }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[DELETE /api/reservas] Starting request', { environment: envInfo.environment });
  
  try {
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[DELETE /api/reservas] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Si no está disponible en el contexto, intentar desde process.env (OpenNext lo popula)
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[DELETE /api/reservas] DB obtained from process.env.DB (OpenNext fallback)');
    }
    
    if (!db) {
      // Si no hay DB disponible, usar mock como fallback
      db = getMockDBInstance();
      console.log('[DELETE /api/reservas] Using mock DB as fallback');
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');
    const clase_id = searchParams.get('clase_id');
    const fecha_clase = searchParams.get('fecha_clase');

    if (!usuario_id || !clase_id) {
      return NextResponse.json({ error: 'Usuario ID y Clase ID requeridos' }, { status: 400 });
    }

    const claseIdNum = typeof clase_id === 'string' ? parseInt(clase_id, 10) : clase_id;
    
    // Determinar la fecha_clase para evaluar lista de espera después
    // Si fecha_clase se especifica, significa que se está eliminando para una fecha específica
    // (ya sea una reserva temporal o una reserva fija que se cancela para esa fecha)
    // Solo promovemos si hay una fecha_clase específica
    let fechaClaseParaLista: string | null = fecha_clase;

    // Si se especifica fecha_clase, puede ser:
    // 1. Eliminar reserva temporal para esa fecha específica
    // 2. Cancelar reserva fija solo para esa fecha (desde el modal del calendario)
    if (fecha_clase) {
      // Intentar eliminar reserva temporal primero
      const reservaTemporal = await db.prepare(`
        SELECT * FROM reserva 
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
      `).bind(usuario_id, clase_id, fecha_clase).first();
      
      if (reservaTemporal) {
        // Eliminar reserva temporal
        const deleteResult = await db.prepare(`
          DELETE FROM reserva 
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
        `).bind(usuario_id, clase_id, fecha_clase).run();
        console.log('[DELETE /api/reservas] Reserva temporal eliminada', { 
          usuario_id, 
          clase_id, 
          fecha_clase,
          changes: (deleteResult as any)?.meta?.changes || 0
        });
      } else {
        // Verificar si hay una reserva fija (sin fecha_clase)
        const reservaFija = await db.prepare(`
          SELECT * FROM reserva 
          WHERE usuario_id = ? AND clase_id = ? 
            AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
            AND (es_reasignacion IS NULL OR es_reasignacion = 0)
        `).bind(usuario_id, clase_id).first();
        
        if (reservaFija) {
          // Hay una reserva fija, pero se está cancelando solo para esta fecha específica
          // Crear una entrada en la tabla cancelacion para esta fecha específica
          // No eliminamos la reserva fija (sigue válida para otras fechas)
          console.log('[DELETE /api/reservas] 🔍 Reserva fija existe, creando cancelación para fecha específica:', {
            usuario_id,
            tipo_usuario_id: typeof usuario_id,
            clase_id,
            tipo_clase_id: typeof clase_id,
            fecha_clase
          });
          
          try {
            // Asegurar que usuario_id y clase_id sean números
            const usuarioIdNum = Number(usuario_id);
            const claseIdNum = Number(clase_id);
            
            // Verificar si la tabla cancelacion existe, si no, crearla
            try {
              await db.prepare(`SELECT 1 FROM cancelacion LIMIT 1`).first();
            } catch (tableCheckError: any) {
              if (tableCheckError.message && tableCheckError.message.includes('no such table')) {
                console.log('[DELETE /api/reservas] Tabla cancelacion no existe, creándola...');
                await db.prepare(`
                  CREATE TABLE IF NOT EXISTS cancelacion (
                    usuario_id INTEGER NOT NULL,
                    clase_id INTEGER NOT NULL,
                    fecha_clase TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    PRIMARY KEY (usuario_id, clase_id, fecha_clase),
                    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
                    FOREIGN KEY (clase_id) REFERENCES clase(id) ON DELETE CASCADE
                  )
                `).run();
                console.log('[DELETE /api/reservas] ✅ Tabla cancelacion creada');
              }
            }
            
            // Verificar si ya existe una cancelación para esta combinación
            const cancelacionExistente = await db.prepare(`
              SELECT * FROM cancelacion
              WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
            `).bind(usuarioIdNum, claseIdNum, fecha_clase).first();
            
            if (!cancelacionExistente) {
              // Crear la cancelación solo si no existe
              const insertCancelacion = await db.prepare(`
                INSERT INTO cancelacion (usuario_id, clase_id, fecha_clase, created_at)
                VALUES (?, ?, ?, datetime('now'))
              `).bind(usuarioIdNum, claseIdNum, fecha_clase).run();
              
              console.log('[DELETE /api/reservas] ✅ Cancelación creada exitosamente para reserva fija', {
                usuario_id: usuarioIdNum,
                clase_id: claseIdNum,
                fecha_clase,
                changes: (insertCancelacion as any)?.meta?.changes || 0,
                lastRowId: (insertCancelacion as any)?.meta?.last_row_id
              });
              
              // Verificar que se creó correctamente
              const verificacion = await db.prepare(`
                SELECT * FROM cancelacion
                WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
              `).bind(usuarioIdNum, claseIdNum, fecha_clase).first();
              
              if (verificacion) {
                console.log('[DELETE /api/reservas] ✅ Verificación: Cancelación existe en BD', verificacion);
              } else {
                console.error('[DELETE /api/reservas] ❌ ERROR: Cancelación NO se encontró después de crearla');
              }
            } else {
              console.log('[DELETE /api/reservas] ⚠️ Cancelación ya existe para esta combinación:', cancelacionExistente);
            }
          } catch (cancelacionError: any) {
            console.error('[DELETE /api/reservas] ❌ ERROR al crear cancelación:', {
              message: cancelacionError.message,
              stack: cancelacionError.stack,
              usuario_id,
              clase_id,
              fecha_clase
            });
            // No lanzar el error, solo loguearlo para que el flujo continúe
          }
          
          // Verificar lista de espera porque se liberó un cupo para esta fecha
          console.log('[DELETE /api/reservas] Cancelación creada, verificando lista de espera para esta fecha');
        } else {
          console.log('[DELETE /api/reservas] No se encontró reserva temporal ni fija para eliminar');
        }
      }
      fechaClaseParaLista = fecha_clase;
    } else {
      // Eliminar reserva fija completamente (sin fecha_clase)
      await db.prepare(`
        DELETE FROM reserva 
        WHERE usuario_id = ? AND clase_id = ? 
          AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
          AND (es_reasignacion IS NULL OR es_reasignacion = 0)
      `).bind(usuario_id, clase_id).run();
      // Para reservas fijas eliminadas completamente, no podemos promover automáticamente
      // porque afecta todas las fechas, no una fecha específica
      fechaClaseParaLista = null;
    }

    console.log('[DELETE /api/reservas] Reserva eliminada', { usuario_id, clase_id, fecha_clase });

    // Si se eliminó una reserva temporal o se canceló una fija (con fecha_clase), verificar si hay cupo disponible
    // y promover al siguiente en lista de espera
    if (fechaClaseParaLista) {
      try {
        // Verificar cupo actual después de la eliminación/cancelación
        // Contar reservas fijas que NO tienen cancelación para esta fecha específica
        const reservasFijasQuery = await db.prepare(`
          SELECT COUNT(DISTINCT r.usuario_id) as count
          FROM reserva r
          WHERE r.clase_id = ? 
            AND (r.fecha_clase IS NULL OR r.fecha_clase = 'null' OR r.fecha_clase = '')
            AND (r.es_reasignacion IS NULL OR r.es_reasignacion = 0)
            AND NOT EXISTS (
              SELECT 1 FROM cancelacion c
              WHERE c.usuario_id = r.usuario_id 
                AND c.clase_id = r.clase_id 
                AND c.fecha_clase = ?
            )
        `).bind(claseIdNum, fechaClaseParaLista).first();
        
        const countFijas = (reservasFijasQuery as any)?.count || 0;

        const reservasTemporales = await db.prepare(`
          SELECT COUNT(DISTINCT usuario_id) as count
          FROM reserva
          WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
        `).bind(claseIdNum, fechaClaseParaLista).first();
        
        const countTemporales = (reservasTemporales as any)?.count || 0;

        const cupoMaximo = 35;
        const totalConfirmados = countFijas + countTemporales;
        const cupoDisponible = cupoMaximo - totalConfirmados;

        console.log('[DELETE /api/reservas] Cupo después de eliminación', { 
          countFijas, 
          countTemporales, 
          totalConfirmados, 
          cupoDisponible,
          cupoMaximo 
        });

        // Si hay cupo disponible, promover al primero en lista de espera
        if (cupoDisponible > 0) {
          console.log('[DELETE /api/reservas] ✅ Hay cupo disponible, buscando primer usuario en lista de espera...');
          console.log('[DELETE /api/reservas] Parámetros de búsqueda:', {
            claseIdNum,
            tipo_claseIdNum: typeof claseIdNum,
            fechaClaseParaLista,
            tipo_fechaClase: typeof fechaClaseParaLista
          });
          
          // Obtener el primero en lista de espera (numero = 1 o el menor número disponible)
          // Intentar con número primero
          let primeroEnLista = await db.prepare(`
            SELECT * FROM lista_espera
            WHERE clase_id = ? AND fecha_clase = ?
            ORDER BY numero ASC
            LIMIT 1
          `).bind(claseIdNum, fechaClaseParaLista).first();

          // Si no se encuentra, intentar con string
          if (!primeroEnLista) {
            console.log('[DELETE /api/reservas] No encontrado con número, intentando con string...');
            primeroEnLista = await db.prepare(`
              SELECT * FROM lista_espera
              WHERE clase_id = ? AND fecha_clase = ?
              ORDER BY numero ASC
              LIMIT 1
            `).bind(clase_id, fechaClaseParaLista).first();
          }

          console.log('[DELETE /api/reservas] Resultado de búsqueda en lista_espera:', primeroEnLista ? 'ENCONTRADO' : 'NO ENCONTRADO', primeroEnLista);

          if (primeroEnLista) {
            const siguienteUsuarioId = (primeroEnLista as any).usuario_id;
            const numeroEnLista = (primeroEnLista as any).numero;
            console.log('[DELETE /api/reservas] ✅ Usuario encontrado en lista de espera', { 
              usuario_id: siguienteUsuarioId,
              tipo_usuario_id: typeof siguienteUsuarioId,
              clase_id: claseIdNum, 
              tipo_clase_id: typeof claseIdNum,
              fecha_clase: fechaClaseParaLista,
              numero_en_lista: numeroEnLista,
              cupo_disponible: cupoDisponible
            });

            // Verificar que el usuario no tenga ya una reserva temporal para esta fecha
            const reservaExistente = await db.prepare(`
              SELECT * FROM reserva 
              WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
            `).bind(siguienteUsuarioId, claseIdNum, fechaClaseParaLista).first();

            console.log('[DELETE /api/reservas] Verificando si usuario ya tiene reserva:', reservaExistente ? 'SÍ tiene reserva' : 'NO tiene reserva');

            if (!reservaExistente) {
              console.log('[DELETE /api/reservas] 🎯 Creando reserva temporal para usuario promovido...');
              console.log('[DELETE /api/reservas] Valores para INSERT:', {
                usuario_id: siguienteUsuarioId,
                tipo_usuario_id: typeof siguienteUsuarioId,
                clase_id: claseIdNum,
                tipo_clase_id: typeof claseIdNum,
                fecha_clase: fechaClaseParaLista,
                tipo_fecha_clase: typeof fechaClaseParaLista
              });
              
              // Crear reserva temporal para el usuario promovido
              try {
                const insertResult = await db.prepare(`
                  INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
                  VALUES (?, ?, ?, 1, datetime('now'))
                `).bind(siguienteUsuarioId, claseIdNum, fechaClaseParaLista).run();

                console.log('[DELETE /api/reservas] ✅ Reserva temporal creada exitosamente', {
                  usuario_id: siguienteUsuarioId,
                  clase_id: claseIdNum,
                  fecha_clase: fechaClaseParaLista,
                  insertChanges: (insertResult as any)?.meta?.changes || 0,
                  lastRowId: (insertResult as any)?.meta?.last_row_id
                });

                // Verificar que la reserva se creó correctamente
                const reservaVerificada = await db.prepare(`
                  SELECT * FROM reserva 
                  WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
                `).bind(siguienteUsuarioId, claseIdNum, fechaClaseParaLista).first();

                if (reservaVerificada) {
                  console.log('[DELETE /api/reservas] ✅ Verificación: Reserva temporal existe en BD');
                } else {
                  console.error('[DELETE /api/reservas] ❌ ERROR: Reserva temporal NO se creó correctamente');
                }

                // Eliminar de lista de espera
                const deleteResult = await db.prepare(`
                  DELETE FROM lista_espera
                  WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
                `).bind(siguienteUsuarioId, claseIdNum, fechaClaseParaLista).run();

                console.log('[DELETE /api/reservas] ✅ Eliminado de lista de espera', {
                  deleteChanges: (deleteResult as any)?.meta?.changes || 0
                });

                // Verificar que se eliminó de lista de espera
                const enListaVerificada = await db.prepare(`
                  SELECT * FROM lista_espera
                  WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
                `).bind(siguienteUsuarioId, claseIdNum, fechaClaseParaLista).first();

                if (!enListaVerificada) {
                  console.log('[DELETE /api/reservas] ✅ Verificación: Usuario eliminado correctamente de lista_espera');
                } else {
                  console.error('[DELETE /api/reservas] ❌ ERROR: Usuario todavía está en lista_espera');
                }

                // Reordenar números de lista de espera (renumerar desde 1)
                const listaRestante = await db.prepare(`
                  SELECT * FROM lista_espera
                  WHERE clase_id = ? AND fecha_clase = ?
                  ORDER BY numero ASC
                `).bind(claseIdNum, fechaClaseParaLista).all();

                const items = (listaRestante.results || []) as any[];
                console.log('[DELETE /api/reservas] Reordenando', items.length, 'usuarios restantes en lista de espera...');
                
                for (let i = 0; i < items.length; i++) {
                  await db.prepare(`
                    UPDATE lista_espera
                    SET numero = ?
                    WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
                  `).bind(i + 1, items[i].usuario_id, claseIdNum, fechaClaseParaLista).run();
                }

                console.log('[DELETE /api/reservas] ✅ Usuario promovido exitosamente de lista de espera a temporal confirmado', {
                  usuario_id: siguienteUsuarioId,
                  usuarios_restantes_en_lista: items.length,
                  cupo_disponible_antes: cupoDisponible,
                  cupo_disponible_despues: cupoDisponible - 1
                });
              } catch (insertError: any) {
                console.error('[DELETE /api/reservas] ❌ ERROR al crear reserva temporal:', insertError.message);
                console.error('[DELETE /api/reservas] Stack:', insertError.stack);
                throw insertError;
              }

            } else {
              console.log('[DELETE /api/reservas] ⚠️ El usuario en lista de espera ya tiene reserva, eliminando de lista de espera');
              // Si ya tiene reserva, solo eliminar de lista de espera
              await db.prepare(`
                DELETE FROM lista_espera
                WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
              `).bind(siguienteUsuarioId, claseIdNum, fechaClaseParaLista).run();

              // Reordenar números
              const listaRestante = await db.prepare(`
                SELECT * FROM lista_espera
                WHERE clase_id = ? AND fecha_clase = ?
                ORDER BY numero ASC
              `).bind(claseIdNum, fechaClaseParaLista).all();

              const items = (listaRestante.results || []) as any[];
              for (let i = 0; i < items.length; i++) {
                await db.prepare(`
                  UPDATE lista_espera
                  SET numero = ?
                  WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
                `).bind(i + 1, items[i].usuario_id, claseIdNum, fechaClaseParaLista).run();
              }
            }
          } else {
            console.log('[DELETE /api/reservas] ℹ️ No hay nadie en lista de espera para esta clase y fecha');
          }
        } else {
          console.log('[DELETE /api/reservas] ⚠️ No hay cupo disponible después de eliminar (total:', totalConfirmados, '>=', cupoMaximo, '), no se puede promover');
        }
      } catch (error: any) {
        // Si hay error con lista de espera, solo loguear pero no fallar la eliminación
        console.error('[DELETE /api/reservas] Error al procesar lista de espera después de eliminar reserva:', error.message);
      }
    }

    // Respuesta con información sobre si se promovió alguien
    const respuesta: any = { success: true };
    
    if (fechaClaseParaLista) {
      // Intentar verificar si se promovió alguien
      try {
        const reservasFijasFinal = await db.prepare(`
          SELECT COUNT(DISTINCT usuario_id) as count
          FROM reserva
          WHERE clase_id = ? AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
            AND (es_reasignacion IS NULL OR es_reasignacion = 0)
        `).bind(claseIdNum).first();
        
        const reservasTemporalesFinal = await db.prepare(`
          SELECT COUNT(DISTINCT usuario_id) as count
          FROM reserva
          WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
        `).bind(claseIdNum, fechaClaseParaLista).first();
        
        const listaEsperaFinal = await db.prepare(`
          SELECT COUNT(*) as count
          FROM lista_espera
          WHERE clase_id = ? AND fecha_clase = ?
        `).bind(claseIdNum, fechaClaseParaLista).first().catch(() => ({ count: 0 }));
        
        respuesta.cupoFinal = {
          fijas: (reservasFijasFinal as any)?.count || 0,
          temporales: (reservasTemporalesFinal as any)?.count || 0,
          enListaEspera: ((listaEsperaFinal as any)?.count || 0),
          totalConfirmados: ((reservasFijasFinal as any)?.count || 0) + ((reservasTemporalesFinal as any)?.count || 0)
        };
      } catch (error) {
        console.error('[DELETE /api/reservas] Error obteniendo estado final:', error);
      }
    }

    console.log('[DELETE /api/reservas] Success', { usuario_id, clase_id, fecha_clase, respuesta });
    return NextResponse.json(respuesta);
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al eliminar reserva',
      { route: '/api/reservas', method: 'DELETE', operation: 'delete_reserva' }
    );
  }
}
