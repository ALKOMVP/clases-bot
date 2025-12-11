import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

// OpenNext no requiere runtime = 'edge' explícito

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/export] Starting request', { environment: envInfo.environment });
  
  try {
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[GET /api/export] DB obtained from Cloudflare context (OpenNext)');
    }
    
    if (!db) {
      // Si no hay DB disponible, usar mock como fallback
      db = getMockDBInstance();
      console.log('[GET /api/export] Using mock DB as fallback');
    }
    
    // Verificar que la DB esté disponible
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json, csv, sql

    // Obtener datos de alumnos
    const usuariosResult = await db.prepare('SELECT * FROM usuario ORDER BY apellido, nombre').all();
    const usuarios = (usuariosResult?.results || []) as any[];

    // Obtener datos de clases
    const clasesResult = await db.prepare('SELECT * FROM clase ORDER BY dia, hora').all();
    const clases = (clasesResult?.results || []) as any[];

    // Obtener datos de reservas (relación alumnos-clases)
    const reservasResult = await db.prepare(`
      SELECT 
        r.usuario_id,
        r.clase_id,
        r.created_at,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido,
        u.email as usuario_email,
        u.telefono as usuario_telefono,
        c.dia as clase_dia,
        c.hora as clase_hora,
        c.nombre as clase_nombre
      FROM reserva r
      LEFT JOIN usuario u ON r.usuario_id = u.id
      LEFT JOIN clase c ON r.clase_id = c.id
      ORDER BY r.created_at DESC
    `).all();
    const reservas = (reservasResult?.results || []) as any[];

    const data = {
      export_date: new Date().toISOString(),
      alumnos: usuarios,
      clases: clases,
      reservas: reservas,
      summary: {
        total_alumnos: usuarios.length,
        total_clases: clases.length,
        total_reservas: reservas.length
      }
    };

    // Formatear según el formato solicitado
    if (format === 'csv') {
      // Generar CSV
      let csv = '';

      // CSV de Alumnos
      csv += '=== ALUMNOS ===\n';
      csv += 'ID,Nombre,Apellido,Email,Teléfono,Fecha Alta\n';
      usuarios.forEach(u => {
        csv += `${u.id},"${u.nombre}","${u.apellido}","${u.email}","${u.telefono || ''}","${u.fecha_alta || ''}"\n`;
      });

      csv += '\n=== CLASES ===\n';
      csv += 'ID,Día,Hora,Nombre\n';
      clases.forEach(c => {
        csv += `${c.id},"${c.dia}","${c.hora}","${c.nombre}"\n`;
      });

      csv += '\n=== RESERVAS ===\n';
      csv += 'Usuario ID,Usuario Nombre,Usuario Apellido,Usuario Email,Clase ID,Clase Día,Clase Hora,Clase Nombre,Fecha Reserva\n';
      reservas.forEach(r => {
        csv += `${r.usuario_id},"${r.usuario_nombre || ''}","${r.usuario_apellido || ''}","${r.usuario_email || ''}",${r.clase_id},"${r.clase_dia || ''}","${r.clase_hora || ''}","${r.clase_nombre || ''}","${r.created_at || ''}"\n`;
      });

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="clases-bot-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'sql') {
      // Generar SQL INSERT statements
      let sql = `-- Export de Clases Bot - ${new Date().toISOString()}\n\n`;
      
      sql += '-- Alumnos\n';
      usuarios.forEach(u => {
        sql += `INSERT OR REPLACE INTO usuario (id, nombre, apellido, email, telefono, fecha_alta) VALUES (${u.id}, '${u.nombre.replace(/'/g, "''")}', '${u.apellido.replace(/'/g, "''")}', '${u.email.replace(/'/g, "''")}', '${(u.telefono || '').replace(/'/g, "''")}', '${u.fecha_alta || ''}');\n`;
      });

      sql += '\n-- Clases\n';
      clases.forEach(c => {
        sql += `INSERT OR REPLACE INTO clase (id, dia, hora, nombre) VALUES (${c.id}, '${c.dia}', '${c.hora}', '${c.nombre.replace(/'/g, "''")}');\n`;
      });

      sql += '\n-- Reservas\n';
      reservas.forEach(r => {
        sql += `INSERT OR REPLACE INTO reserva (usuario_id, clase_id, created_at) VALUES (${r.usuario_id}, ${r.clase_id}, '${r.created_at || new Date().toISOString()}');\n`;
      });

      return new NextResponse(sql, {
        headers: {
          'Content-Type': 'text/sql; charset=utf-8',
          'Content-Disposition': `attachment; filename="clases-bot-export-${new Date().toISOString().split('T')[0]}.sql"`,
        },
      });
    } else {
      // JSON (por defecto)
      return NextResponse.json(data, {
        headers: {
          'Content-Disposition': `attachment; filename="clases-bot-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al exportar datos',
      { route: '/api/export', method: 'GET', operation: 'export_data' }
    );
  }
}





