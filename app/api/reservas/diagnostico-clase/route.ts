import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/reservas/diagnostico-clase] Starting request', { environment: envInfo.environment });
  
  try {
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[GET /api/reservas/diagnostico-clase] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Si no está disponible en el contexto, intentar desde process.env (OpenNext lo popula)
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[GET /api/reservas/diagnostico-clase] DB obtained from process.env.DB (OpenNext fallback)');
    }
    
    if (!db) {
      db = getMockDBInstance();
      console.log('[GET /api/reservas/diagnostico-clase] Using mock DB as fallback');
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

    // Convertir clase_id a número si es string
    const claseIdNum = typeof clase_id === 'string' ? parseInt(clase_id, 10) : clase_id;

    console.log('[GET /api/reservas/diagnostico-clase] Parámetros:', { clase_id, claseIdNum, fecha_clase });

    // Contar reservas fijas
    const reservasFijasQuery = await db.prepare(`
      SELECT COUNT(DISTINCT usuario_id) as count
      FROM reserva
      WHERE clase_id = ? AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
        AND (es_reasignacion IS NULL OR es_reasignacion = 0)
    `).bind(claseIdNum).first();
    
    const reservasFijas = (reservasFijasQuery as any)?.count || 0;

    // Contar reservas temporales confirmadas para esta fecha
    const reservasTemporalesQuery = await db.prepare(`
      SELECT COUNT(DISTINCT usuario_id) as count
      FROM reserva
      WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
    `).bind(claseIdNum, fecha_clase).first();
    
    const reservasTemporales = (reservasTemporalesQuery as any)?.count || 0;

    // Contar lista de espera
    let listaEsperaCount = 0;
    let listaEsperaDetalles: any[] = [];
    try {
      const listaEsperaQuery = await db.prepare(`
        SELECT le.*, u.nombre, u.apellido
        FROM lista_espera le
        JOIN usuario u ON le.usuario_id = u.id
        WHERE le.clase_id = ? AND le.fecha_clase = ?
        ORDER BY le.numero ASC
      `).bind(claseIdNum, fecha_clase).all();
      
      listaEsperaDetalles = (listaEsperaQuery.results || []) as any[];
      listaEsperaCount = listaEsperaDetalles.length;
    } catch (error) {
      // Si la tabla no existe, continuar con array vacío
      console.log('[GET /api/reservas/diagnostico-clase] Tabla lista_espera no existe, usando array vacío');
    }

    const cupoMaximo = 35;
    const alumnosConfirmados = reservasFijas + reservasTemporales;
    const cupoDisponible = Math.max(0, cupoMaximo - alumnosConfirmados);
    const cupoCompleto = alumnosConfirmados >= cupoMaximo;

    const resumen = {
      reservasFijas,
      reservasTemporales,
      alumnosConfirmados,
      cupoMaximo,
      cupoDisponible,
      cupoCompleto,
      listaEspera: listaEsperaCount
    };

    const detalles = {
      listaEspera: listaEsperaDetalles.map(item => ({
        usuario_id: item.usuario_id,
        numero: item.numero,
        nombre: item.nombre,
        apellido: item.apellido
      }))
    };

    console.log('[GET /api/reservas/diagnostico-clase] Success', { clase_id, fecha_clase, resumen });
    return NextResponse.json({
      resumen,
      detalles
    });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al obtener diagnóstico de clase',
      { route: '/api/reservas/diagnostico-clase', method: 'GET', operation: 'get_diagnostico' }
    );
  }
}

