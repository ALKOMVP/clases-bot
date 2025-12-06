import { NextRequest, NextResponse } from 'next/server';
import { getOptionalRequestContext } from '@cloudflare/next-on-pages';
import { getDB } from '@/lib/db';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // En Cloudflare Pages, el binding D1 está disponible a través de getOptionalRequestContext().env.DB
    const context = getOptionalRequestContext();
    const db = context?.env && (context.env as any).DB
      ? getDB({ DB: (context.env as any).DB })
      : getDB();
    if (!db) {
      console.error('GET usuarios: DB not available', {
        hasContext: !!context,
        hasEnv: !!context?.env,
        hasDB: !!(context?.env && (context.env as any).DB),
        envKeys: context?.env ? Object.keys(context.env) : []
      });
      return NextResponse.json({ 
        error: 'Database not available. Please configure D1 binding in Cloudflare Pages dashboard.' 
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const result = await db.prepare('SELECT * FROM usuario WHERE id = ?').bind(id).first();
      return NextResponse.json(result);
    }

    const result = await db.prepare('SELECT * FROM usuario ORDER BY apellido, nombre').all();
    
    const usuarios = result?.results || [];
    return NextResponse.json(Array.isArray(usuarios) ? usuarios : []);
  } catch (error) {
    console.error('Error fetching usuarios:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // En Cloudflare Pages, el binding D1 está disponible a través de getOptionalRequestContext().env.DB
    const context = getOptionalRequestContext();
    const db = context?.env && (context.env as any).DB
      ? getDB({ DB: (context.env as any).DB })
      : getDB();
    if (!db) {
      return NextResponse.json({ 
        error: 'Database not available. Please configure D1 binding in Cloudflare Pages dashboard.' 
      }, { status: 500 });
    }

    const { nombre, apellido, email, fecha_alta } = await request.json();

    if (!nombre || !apellido || !email) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const fechaAlta = fecha_alta || new Date().toISOString().split('T')[0];
    const result = await db.prepare(
      'INSERT INTO usuario (nombre, apellido, email, fecha_alta) VALUES (?, ?, ?, ?)'
    ).bind(nombre, apellido, email, fechaAlta).run();

    // Manejar diferentes estructuras de respuesta (mock DB vs D1 real)
    const lastRowId = result && typeof result === 'object' 
      ? (result as any).meta?.last_row_id || (result as any).last_row_id
      : null;

    return NextResponse.json({ success: true, id: lastRowId });
  } catch (error: any) {
    console.error('Error creating usuario:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    if (error.message?.includes('UNIQUE constraint') || error.message?.includes('email')) {
      return NextResponse.json({ error: 'El email ya existe' }, { status: 400 });
    }
    if (error.message?.includes('Faltan')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: `Error al crear usuario: ${error.message || 'Error desconocido'}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // En Cloudflare Pages, el binding D1 está disponible a través de getOptionalRequestContext().env.DB
    const context = getOptionalRequestContext();
    const db = context?.env && (context.env as any).DB
      ? getDB({ DB: (context.env as any).DB })
      : getDB();
    if (!db) {
      return NextResponse.json({ 
        error: 'Database not available. Please configure D1 binding in Cloudflare Pages dashboard.' 
      }, { status: 500 });
    }

    const { id, nombre, apellido, email, fecha_alta } = await request.json();

    if (!id || !nombre || !apellido || !email) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    await db.prepare(
      'UPDATE usuario SET nombre = ?, apellido = ?, email = ?, fecha_alta = ? WHERE id = ?'
    ).bind(nombre, apellido, email, fecha_alta, id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating usuario:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // En Cloudflare Pages, el binding D1 está disponible a través de getOptionalRequestContext().env.DB
    const context = getOptionalRequestContext();
    const db = context?.env && (context.env as any).DB
      ? getDB({ DB: (context.env as any).DB })
      : getDB();
    if (!db) {
      return NextResponse.json({ 
        error: 'Database not available. Please configure D1 binding in Cloudflare Pages dashboard.' 
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await db.prepare('DELETE FROM usuario WHERE id = ?').bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting usuario:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
