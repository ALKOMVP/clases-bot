import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getDB } from '@/lib/db';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // En Cloudflare Pages, el binding D1 está disponible a través de getRequestContext().env.DB
    let db: any = null;
    try {
      const { env } = getRequestContext();
      db = getDB({ DB: (env as any).DB });
    } catch (e) {
      db = getDB();
    }
    if (!db) {
      return NextResponse.json({ 
        error: 'Database not available. Please configure D1 binding in Cloudflare Pages dashboard.' 
      }, { status: 500 });
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
  } catch (error) {
    console.error('Error fetching reservas:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // En Cloudflare Pages, el binding D1 está disponible a través de getRequestContext().env.DB
    let db: any = null;
    try {
      const { env } = getRequestContext();
      db = getDB({ DB: (env as any).DB });
    } catch (e) {
      db = getDB();
    }
    if (!db) {
      return NextResponse.json({ 
        error: 'Database not available. Please configure D1 binding in Cloudflare Pages dashboard.' 
      }, { status: 500 });
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
    // En Cloudflare Pages, el binding D1 está disponible a través de getRequestContext().env.DB
    let db: any = null;
    try {
      const { env } = getRequestContext();
      db = getDB({ DB: (env as any).DB });
    } catch (e) {
      db = getDB();
    }
    if (!db) {
      return NextResponse.json({ 
        error: 'Database not available. Please configure D1 binding in Cloudflare Pages dashboard.' 
      }, { status: 500 });
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
