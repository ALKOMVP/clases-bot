import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  
  try {
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
    }
    
    if (!db) {
      db = getMockDBInstance();
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    // Obtener todas las reservas de usuarios desactivados
    const reservasDesactivados = await db.prepare(`
      SELECT r.usuario_id, r.clase_id
      FROM reserva r
      JOIN usuario u ON r.usuario_id = u.id
      WHERE u.activo = 0 OR u.activo IS NULL
    `).all();

    const reservas = (reservasDesactivados?.results || []) as any[];
    let eliminadas = 0;

    // Eliminar cada reserva
    for (const reserva of reservas) {
      try {
        await db.prepare(
          'DELETE FROM reserva WHERE usuario_id = ? AND clase_id = ?'
        ).bind(reserva.usuario_id, reserva.clase_id).run();
        eliminadas++;
      } catch (error: any) {
        console.error(`Error eliminando reserva ${reserva.usuario_id}-${reserva.clase_id}:`, error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Se eliminaron ${eliminadas} reservas de alumnos desactivados`,
      eliminadas
    });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al limpiar reservas de alumnos desactivados',
      { route: '/api/reservas/cleanup-desactivados', method: 'POST', operation: 'cleanup_desactivados' }
    );
  }
}
