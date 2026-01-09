import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/cancelaciones] Starting request', { environment: envInfo.environment });
  
  try {
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[GET /api/cancelaciones] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Si no está disponible en el contexto, intentar desde process.env (OpenNext lo popula)
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[GET /api/cancelaciones] DB obtained from process.env.DB (OpenNext fallback)');
    }
    
    if (!db) {
      db = getMockDBInstance();
      console.log('[GET /api/cancelaciones] Using mock DB as fallback');
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    // Verificar si la tabla cancelacion existe, si no, crearla
    let tablaExiste = false;
    try {
      await db.prepare(`SELECT 1 FROM cancelacion LIMIT 1`).first();
      tablaExiste = true;
      console.log('[GET /api/cancelaciones] ✅ Tabla cancelacion existe');
    } catch (tableCheckError: any) {
      console.log('[GET /api/cancelaciones] Error al verificar tabla:', {
        message: tableCheckError.message,
        includes_no_such_table: tableCheckError.message?.includes('no such table')
      });
      
      if (tableCheckError.message && tableCheckError.message.includes('no such table')) {
        console.log('[GET /api/cancelaciones] 🔧 Tabla cancelacion no existe, creándola...');
        try {
          const createResult = await db.prepare(`
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
          
          console.log('[GET /api/cancelaciones] ✅ Tabla cancelacion creada exitosamente', {
            changes: (createResult as any)?.meta?.changes || 0
          });
          tablaExiste = true;
          
          // Verificar que se creó correctamente
          try {
            await db.prepare(`SELECT 1 FROM cancelacion LIMIT 1`).first();
            console.log('[GET /api/cancelaciones] ✅ Verificación: Tabla cancelacion existe después de crearla');
          } catch (verifyError: any) {
            console.error('[GET /api/cancelaciones] ❌ ERROR: Tabla cancelacion NO existe después de crearla:', verifyError.message);
          }
        } catch (createError: any) {
          console.error('[GET /api/cancelaciones] ❌ ERROR creando tabla cancelacion:', {
            message: createError.message,
            stack: createError.stack
          });
          // Continuar y devolver array vacío
        }
      } else {
        console.error('[GET /api/cancelaciones] ❌ Error verificando tabla (no es "no such table"):', tableCheckError.message);
      }
    }
    
    const query = `
      SELECT 
        c.usuario_id,
        c.clase_id,
        c.fecha_clase,
        c.created_at,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido,
        cl.dia as clase_dia,
        cl.hora as clase_hora,
        cl.nombre as clase_nombre
      FROM cancelacion c
      JOIN usuario u ON c.usuario_id = u.id
      JOIN clase cl ON c.clase_id = cl.id
      ORDER BY c.fecha_clase DESC, c.created_at DESC
    `;

    // Si la tabla no existe, devolver array vacío directamente sin intentar query
    if (!tablaExiste) {
      console.log('[GET /api/cancelaciones] ⚠️ Tabla cancelacion no existe, devolviendo array vacío');
      return NextResponse.json([]);
    }
    
    let cancelaciones: any[] = [];
    try {
      const stmt = db.prepare(query);
      const result = await stmt.all();
      cancelaciones = (result.results || []) as any[];
      console.log('[GET /api/cancelaciones] Query ejecutada exitosamente,', cancelaciones.length, 'cancelaciones encontradas');
    } catch (error: any) {
      // Si la tabla no existe todavía, devolver array vacío
      if (error.message && error.message.includes('no such table')) {
        console.log('[GET /api/cancelaciones] ⚠️ Tabla cancelacion todavía no existe después de intentar crearla, devolviendo array vacío');
        console.error('[GET /api/cancelaciones] Error completo:', error);
        return NextResponse.json([]);
      }
      console.error('[GET /api/cancelaciones] ❌ Error ejecutando query:', error);
      cancelaciones = [];
    }

    console.log('[GET /api/cancelaciones] Success', { count: cancelaciones.length });
    return NextResponse.json(cancelaciones);
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al obtener cancelaciones',
      { route: '/api/cancelaciones', method: 'GET', operation: 'fetch_cancelaciones' }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[DELETE /api/cancelaciones] Starting request', { environment: envInfo.environment });
  
  try {
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[DELETE /api/cancelaciones] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Si no está disponible en el contexto, intentar desde process.env (OpenNext lo popula)
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[DELETE /api/cancelaciones] DB obtained from process.env.DB (OpenNext fallback)');
    }
    
    if (!db) {
      db = getMockDBInstance();
      console.log('[DELETE /api/cancelaciones] Using mock DB as fallback');
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    // Eliminar todas las cancelaciones
    try {
      const result = await db.prepare('DELETE FROM cancelacion').run();
      const deleted = result.meta?.changes || 0;
      
      console.log('[DELETE /api/cancelaciones] Success', { deleted });
      return NextResponse.json({ deleted, success: true });
    } catch (error: any) {
      // Si la tabla no existe, devolver éxito con 0 eliminados
      if (error.message && error.message.includes('no such table')) {
        console.log('[DELETE /api/cancelaciones] Tabla cancelacion no existe, no hay nada que eliminar');
        return NextResponse.json({ deleted: 0, success: true });
      }
      throw error;
    }
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al eliminar cancelaciones',
      { route: '/api/cancelaciones', method: 'DELETE', operation: 'delete_all_cancelaciones' }
    );
  }
}

