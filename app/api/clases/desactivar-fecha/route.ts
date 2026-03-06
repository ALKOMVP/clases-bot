import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

function getDb(): any {
  const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
  if (cloudflareContext?.env?.DB) return cloudflareContext.env.DB;
  if (typeof process !== 'undefined' && (process.env as any).DB) return (process.env as any).DB;
  return getMockDBInstance();
}

/** GET: listar fechas desactivadas (opcional: ?clase_id= & ?fecha_clase= o sin params = todas) */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const claseId = searchParams.get('clase_id');
    const fechaClase = searchParams.get('fecha_clase');

    let query = 'SELECT clase_id, fecha_clase FROM clase_desactivada WHERE 1=1';
    const bindings: (string | number)[] = [];
    if (claseId != null && claseId !== '') {
      query += ' AND clase_id = ?';
      bindings.push(Number(claseId));
    }
    if (fechaClase != null && fechaClase !== '') {
      query += ' AND fecha_clase = ?';
      bindings.push(fechaClase);
    }
    query += ' ORDER BY fecha_clase, clase_id';

    let result: any;
    try {
      const stmt = db.prepare(query);
      result = bindings.length ? stmt.bind(...bindings).all() : stmt.all();
    } catch (e: any) {
      if (e?.message?.includes('no such table') || e?.message?.includes('clase_desactivada')) {
        return NextResponse.json({ desactivadas: [] });
      }
      throw e;
    }

    const rows = (result?.results || []) as Array<{ clase_id: number; fecha_clase: string }>;
    return NextResponse.json({ desactivadas: rows });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al listar fechas desactivadas',
      { route: '/api/clases/desactivar-fecha', method: 'GET' }
    );
  }
}

/** POST: desactivar una fecha concreta (body: { clase_id, fecha_clase }) */
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });

    const body = await request.json();
    const claseId = body.clase_id != null ? Number(body.clase_id) : null;
    const fechaClase = typeof body.fecha_clase === 'string' ? body.fecha_clase.trim() : null;

    if (claseId == null || !fechaClase) {
      return NextResponse.json({ error: 'clase_id y fecha_clase son requeridos' }, { status: 400 });
    }

    try {
      await db.prepare(
        'INSERT INTO clase_desactivada (clase_id, fecha_clase) VALUES (?, ?)'
      ).bind(claseId, fechaClase).run();
    } catch (e: any) {
      if (e?.message?.includes('no such table') || e?.message?.includes('clase_desactivada')) {
        try {
          await db.prepare(
            `CREATE TABLE IF NOT EXISTS clase_desactivada (
              clase_id INTEGER NOT NULL,
              fecha_clase TEXT NOT NULL,
              PRIMARY KEY (clase_id, fecha_clase),
              FOREIGN KEY (clase_id) REFERENCES clase(id)
            )`
          ).run();
          await db.prepare(
            'INSERT INTO clase_desactivada (clase_id, fecha_clase) VALUES (?, ?)'
          ).bind(claseId, fechaClase).run();
          return NextResponse.json({ success: true });
        } catch (createErr: any) {
          return NextResponse.json({ error: 'La tabla clase_desactivada no existe. Ejecutá la migración 0010.' }, { status: 400 });
        }
      }
      if (e?.message?.includes('UNIQUE')) {
        return NextResponse.json({ success: true, message: 'Esa fecha ya estaba desactivada' });
      }
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al desactivar fecha',
      { route: '/api/clases/desactivar-fecha', method: 'POST' }
    );
  }
}

/** DELETE: reactivar una fecha (query: ?clase_id= &fecha_clase=) */
export async function DELETE(request: NextRequest) {
  try {
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const claseId = searchParams.get('clase_id');
    const fechaClase = searchParams.get('fecha_clase');

    if (!claseId || !fechaClase) {
      return NextResponse.json({ error: 'clase_id y fecha_clase son requeridos' }, { status: 400 });
    }

    try {
      await db.prepare(
        'DELETE FROM clase_desactivada WHERE clase_id = ? AND fecha_clase = ?'
      ).bind(Number(claseId), fechaClase).run();
    } catch (e: any) {
      if (e?.message?.includes('no such table') || e?.message?.includes('clase_desactivada')) {
        return NextResponse.json({ success: true });
      }
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al reactivar fecha',
      { route: '/api/clases/desactivar-fecha', method: 'DELETE' }
    );
  }
}
