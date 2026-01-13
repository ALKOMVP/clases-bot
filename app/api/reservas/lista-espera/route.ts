import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/reservas/lista-espera] Starting request', { environment: envInfo.environment });
  
  try {
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[GET /api/reservas/lista-espera] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Si no está disponible en el contexto, intentar desde process.env (OpenNext lo popula)
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[GET /api/reservas/lista-espera] DB obtained from process.env.DB (OpenNext fallback)');
    }
    
    if (!db) {
      db = getMockDBInstance();
      console.log('[GET /api/reservas/lista-espera] Using mock DB as fallback');
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const clase_id = searchParams.get('clase_id');
    const fecha_clase = searchParams.get('fecha_clase');

    if (!clase_id || !fecha_clase) {
      return NextResponse.json({ 
        error: 'Faltan parámetros requeridos (clase_id, fecha_clase)',
        code: 'PARAMETROS_FALTANTES'
      }, { status: 400 });
    }

    try {
      // Verificar primero si la columna numero existe
      // Si no existe, crear la tabla o agregar la columna
      try {
        // Intentar una consulta simple para verificar la estructura
        await db.prepare('SELECT numero FROM lista_espera LIMIT 1').first();
      } catch (checkError: any) {
        // Si la tabla no existe o la columna numero no existe, crear/actualizar la tabla
        if (checkError.message && (checkError.message.includes('no such table') || checkError.message.includes('no such column'))) {
          console.log('[GET /api/reservas/lista-espera] Tabla o columna numero no existe, creando/actualizando...');
          try {
            // Crear tabla si no existe
            await db.prepare(`
              CREATE TABLE IF NOT EXISTS lista_espera (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                clase_id INTEGER NOT NULL,
                fecha_clase DATE NOT NULL,
                numero INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT (datetime('now')),
                reserva_original_id INTEGER,
                fecha_clase_original DATE,
                notificado INTEGER DEFAULT 0,
                FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
                FOREIGN KEY (clase_id) REFERENCES clase(id) ON DELETE CASCADE
              )
            `).run();
            
            // Intentar agregar columna numero si la tabla existía sin ella
            try {
              await db.prepare('ALTER TABLE lista_espera ADD COLUMN numero INTEGER DEFAULT 0').run();
            } catch (alterError: any) {
              // Ignorar error si la columna ya existe
              if (!alterError.message || !alterError.message.includes('duplicate column')) {
                console.warn('[GET /api/reservas/lista-espera] Error al agregar columna numero (puede que ya exista):', alterError.message);
              }
            }
          } catch (createError: any) {
            console.error('[GET /api/reservas/lista-espera] Error al crear tabla:', createError.message);
            // Continuar y devolver array vacío si no se puede crear
            return NextResponse.json([]);
          }
        }
      }

      // OPTIMIZACIÓN: La promoción automática ya se ejecuta en GET /api/reservas cuando hay fecha_clase
      // No duplicar la lógica aquí para evitar ejecuciones redundantes
      // Solo limpiar inconsistencias rápidamente
      try {
        await db.prepare(`
          DELETE FROM lista_espera
          WHERE EXISTS (
            SELECT 1 FROM reserva r
            WHERE r.usuario_id = lista_espera.usuario_id
              AND r.clase_id = lista_espera.clase_id
              AND r.fecha_clase = lista_espera.fecha_clase
              AND r.es_reasignacion = 1
          )
          AND lista_espera.clase_id = ? AND lista_espera.fecha_clase = ?
        `).bind(clase_id, fecha_clase).run();
      } catch (cleanError: any) {
        // No crítico si falla
        if (!cleanError.message?.includes('no such table')) {
          console.warn('[GET /api/reservas/lista-espera] Error en limpieza (no crítico):', cleanError.message || cleanError);
        }
      }

      const query = `
        SELECT le.*, u.nombre, u.apellido
        FROM lista_espera le
        JOIN usuario u ON le.usuario_id = u.id
        WHERE le.clase_id = ? AND le.fecha_clase = ?
        ORDER BY le.numero ASC
      `;

      const stmt = db.prepare(query);
      const result = await stmt.bind(clase_id, fecha_clase).all();
      const listaEspera = (result.results || []) as any[];

      const listaEsperaFormateada = listaEspera.map(item => ({
        usuario_id: item.usuario_id,
        numero: item.numero || 0,
        nombre: item.nombre || '',
        apellido: item.apellido || ''
      }));

      console.log('[GET /api/reservas/lista-espera] Success', { clase_id, fecha_clase, count: listaEsperaFormateada.length });
      return NextResponse.json(listaEsperaFormateada);
    } catch (error: any) {
      // Si la tabla no existe o hay algún otro error, devolver array vacío (no es un error crítico)
      if (error.message && (error.message.includes('no such table') || error.message.includes('no such column'))) {
        console.log('[GET /api/reservas/lista-espera] Tabla lista_espera no existe o falta columna, devolviendo array vacío');
        return NextResponse.json([]);
      }
      throw error;
    }
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al obtener lista de espera',
      { route: '/api/reservas/lista-espera', method: 'GET', operation: 'get_lista_espera' }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[DELETE /api/reservas/lista-espera] Starting request', { environment: envInfo.environment });
  
  try {
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[DELETE /api/reservas/lista-espera] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Si no está disponible en el contexto, intentar desde process.env (OpenNext lo popula)
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[DELETE /api/reservas/lista-espera] DB obtained from process.env.DB (OpenNext fallback)');
    }
    
    if (!db) {
      db = getMockDBInstance();
      console.log('[DELETE /api/reservas/lista-espera] Using mock DB as fallback');
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');
    const clase_id = searchParams.get('clase_id');
    const fecha_clase = searchParams.get('fecha_clase');

    if (!usuario_id || !clase_id || !fecha_clase) {
      return NextResponse.json({ 
        error: 'Faltan parámetros requeridos (usuario_id, clase_id, fecha_clase)',
        code: 'PARAMETROS_FALTANTES'
      }, { status: 400 });
    }

    try {
      // Eliminar de lista de espera
      await db.prepare(`
        DELETE FROM lista_espera
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
      `).bind(usuario_id, clase_id, fecha_clase).run();

      // Reordenar números
      const listaRestante = await db.prepare(`
        SELECT * FROM lista_espera
        WHERE clase_id = ? AND fecha_clase = ?
        ORDER BY numero ASC
      `).bind(clase_id, fecha_clase).all();

      // Actualizar números secuencialmente
      const items = (listaRestante.results || []) as any[];
      for (let i = 0; i < items.length; i++) {
        await db.prepare(`
          UPDATE lista_espera
          SET numero = ?
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
        `).bind(i + 1, items[i].usuario_id, clase_id, fecha_clase).run();
      }

      console.log('[DELETE /api/reservas/lista-espera] Success', { usuario_id, clase_id, fecha_clase });
      return NextResponse.json({ success: true });
    } catch (error: any) {
      // Si la tabla no existe, devolver éxito (no hay nada que eliminar)
      if (error.message && error.message.includes('no such table')) {
        console.log('[DELETE /api/reservas/lista-espera] Tabla lista_espera no existe, no hay nada que eliminar');
        return NextResponse.json({ success: true });
      }
      throw error;
    }
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al eliminar de lista de espera',
      { route: '/api/reservas/lista-espera', method: 'DELETE', operation: 'delete_lista_espera' }
    );
  }
}

