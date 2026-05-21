import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

/**
 * Endpoint batch para obtener conteos de lista de espera para múltiples combinaciones clase-fecha
 * Reduce de 120+ llamadas HTTP a 1 sola llamada
 */
export async function POST(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[POST /api/reservas/lista-espera-counts] Starting request', { environment: envInfo.environment });
  
  try {
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
    } else if (typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
    }
    
    if (!db) {
      db = getMockDBInstance();
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const body = await request.json();
    const { combinaciones } = body; // Array de { clase_id, fecha_clase }

    if (!Array.isArray(combinaciones) || combinaciones.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de combinaciones clase-fecha' }, { status: 400 });
    }

    // Verificar que la tabla existe
    try {
      await db.prepare('SELECT 1 FROM lista_espera LIMIT 1').first();
    } catch (checkError: any) {
      if (checkError.message && checkError.message.includes('no such table')) {
        // Tabla no existe, devolver todos los conteos en 0
        const counts: Record<string, number> = {};
        combinaciones.forEach((c: any) => {
          const key = `${c.clase_id}-${c.fecha_clase}`;
          counts[key] = 0;
        });
        return NextResponse.json({ counts });
      }
      throw checkError;
    }

    // Construir query para obtener todos los conteos en una sola consulta
    const counts: Record<string, number> = {};
    
    // Inicializar todos los conteos en 0
    combinaciones.forEach((c: any) => {
      const key = `${c.clase_id}-${c.fecha_clase}`;
      counts[key] = 0;
    });

    // Obtener conteos en batch usando IN por clase y fecha.
    // Evita una cláusula OR gigante cuando vienen muchas combinaciones.
    try {
      const claseIds = Array.from(
        new Set(
          combinaciones
            .map((c: any) => Number(c?.clase_id))
            .filter((id: number) => Number.isFinite(id))
        )
      );
      const fechas = Array.from(
        new Set(
          combinaciones
            .map((c: any) => String(c?.fecha_clase || '').trim())
            .filter((fecha: string) => fecha.length > 0)
        )
      );

      if (claseIds.length === 0 || fechas.length === 0) {
        return NextResponse.json({ counts });
      }

      const paresSolicitados: Array<{ clase_id: number; fecha_clase: string }> = combinaciones
        .map((c: any) => ({
          clase_id: Number(c?.clase_id),
          fecha_clase: String(c?.fecha_clase || '').trim(),
        }))
        .filter((p) => Number.isFinite(p.clase_id) && p.fecha_clase.length > 0);

      if (paresSolicitados.length === 0) {
        return NextResponse.json({ counts });
      }

      const valuesPlaceholders = paresSolicitados.map(() => '(?, ?)').join(', ');
      const params: any[] = [];
      paresSolicitados.forEach((p) => {
        params.push(p.clase_id, p.fecha_clase);
      });

      const query = `
        WITH requested(clase_id, fecha_clase) AS (
          VALUES ${valuesPlaceholders}
        )
        SELECT le.clase_id, le.fecha_clase, COUNT(*) as count
        FROM lista_espera le
        INNER JOIN requested r
          ON le.clase_id = r.clase_id
          AND le.fecha_clase = r.fecha_clase
        GROUP BY le.clase_id, le.fecha_clase
      `;

      const result = await db.prepare(query).bind(...params).all();
      const rows = (result.results || []) as any[];

      rows.forEach((row: any) => {
        const key = `${row.clase_id}-${row.fecha_clase}`;
        counts[key] = row.count || 0;
      });
    } catch (queryError: any) {
      console.warn('[POST /api/reservas/lista-espera-counts] Error en query batch, usando fallback:', queryError.message);
      // Fallback: hacer queries individuales pero limitar concurrencia
      const batchSize = 10;
      for (let i = 0; i < combinaciones.length; i += batchSize) {
        const batch = combinaciones.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (c: any) => {
            try {
              const result = await db.prepare(`
                SELECT COUNT(*) as count
                FROM lista_espera
                WHERE clase_id = ? AND fecha_clase = ?
              `).bind(c.clase_id, c.fecha_clase).first();
              
              const key = `${c.clase_id}-${c.fecha_clase}`;
              counts[key] = (result as any)?.count || 0;
            } catch (e) {
              const key = `${c.clase_id}-${c.fecha_clase}`;
              counts[key] = 0;
            }
          })
        );
      }
    }

    console.log('[POST /api/reservas/lista-espera-counts] Success', { 
      combinaciones: combinaciones.length,
      countsReturned: Object.keys(counts).length 
    });
    return NextResponse.json({ counts });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al obtener conteos de lista de espera',
      { route: '/api/reservas/lista-espera-counts', method: 'POST', operation: 'get_lista_espera_counts' }
    );
  }
}
