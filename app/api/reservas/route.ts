import { NextRequest, NextResponse } from 'next/server';
import { getOptionalRequestContext } from '@cloudflare/next-on-pages';
import { getDB } from '@/lib/db';
import { getMockDBInstance } from '@/lib/db-mock';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Intentar obtener la BD del contexto de Cloudflare
    let db: any = null;
    
    try {
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
      }
    } catch (e) {
      // getOptionalRequestContext no está disponible
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
      } else {
        console.warn('GET reservas: DB not available, returning empty array');
        return NextResponse.json([]);
      }
    }

    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');
    const clase_id = searchParams.get('clase_id');

    let query = `
      SELECT r.*, u.nombre, u.apellido, u.email, c.dia, c.hora, c.nombre as clase_nombre
      FROM reserva r
      JOIN usuario u ON r.usuario_id = u.id
      JOIN clase c ON r.clase_id = c.id
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

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Ordenar por día y hora
    const ordenDias: { [key: string]: number } = { 'Lun': 1, 'Mar': 2, 'Jue': 3, 'Sab': 4 };
    query += ' ORDER BY c.dia, c.hora, u.apellido, u.nombre';

    const stmt = db.prepare(query);
    const result = params.length > 0 
      ? await stmt.bind(...params).all()
      : await stmt.all();
    
    const reservas = (result.results || []) as any[];
    
    // Ordenar manualmente por día
    reservas.sort((a, b) => {
      const diaA = ordenDias[a.dia] || 99;
      const diaB = ordenDias[b.dia] || 99;
      if (diaA !== diaB) return diaA - diaB;
      return a.hora.localeCompare(b.hora);
    });

    return NextResponse.json(reservas);
  } catch (error: any) {
    console.error('Error fetching reservas:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: String(error)
    });
    return NextResponse.json({ 
      error: 'Error al obtener reservas',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Intentar obtener la BD del contexto de Cloudflare
    let db: any = null;
    
    try {
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
      }
    } catch (e) {
      // getOptionalRequestContext no está disponible
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
      } else {
        console.warn('GET reservas: DB not available, returning empty array');
        return NextResponse.json([]);
      }
    }

    const { usuario_id, clase_id } = await request.json();

    if (!usuario_id || !clase_id) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    await db.prepare(
      'INSERT INTO reserva (usuario_id, clase_id) VALUES (?, ?)'
    ).bind(usuario_id, clase_id).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error creating reserva:', error);
    if (error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'El alumno ya está inscrito en esta clase' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al crear reserva' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Intentar obtener la BD del contexto de Cloudflare
    let db: any = null;
    
    try {
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
      }
    } catch (e) {
      // getOptionalRequestContext no está disponible
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
      } else {
        console.warn('GET reservas: DB not available, returning empty array');
        return NextResponse.json([]);
      }
    }

    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');
    const clase_id = searchParams.get('clase_id');

    if (!usuario_id || !clase_id) {
      return NextResponse.json({ error: 'Usuario ID y Clase ID requeridos' }, { status: 400 });
    }

    await db.prepare('DELETE FROM reserva WHERE usuario_id = ? AND clase_id = ?')
      .bind(usuario_id, clase_id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reserva:', error);
    return NextResponse.json({ error: 'Error al eliminar reserva' }, { status: 500 });
  }
}
