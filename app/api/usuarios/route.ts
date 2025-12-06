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
    
    // Si no hay BD del contexto, intentar process.env.DB
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
    }
    
    // Si no hay BD, usar mock en desarrollo o devolver array vacío en producción
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
      } else {
        // En producción sin BD, devolver array vacío para evitar 500
        console.warn('GET usuarios: DB not available, returning empty array');
        return NextResponse.json([]);
      }
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
  } catch (error: any) {
    console.error('Error fetching usuarios:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: String(error)
    });
    return NextResponse.json({ 
      error: 'Error al obtener usuarios',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
        return NextResponse.json({ 
          error: 'Database not available. Please configure D1 binding in Cloudflare Pages dashboard.' 
        }, { status: 500 });
      }
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
        return NextResponse.json({ 
          error: 'Database not available. Please configure D1 binding in Cloudflare Pages dashboard.' 
        }, { status: 500 });
      }
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
        return NextResponse.json({ 
          error: 'Database not available. Please configure D1 binding in Cloudflare Pages dashboard.' 
        }, { status: 500 });
      }
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
