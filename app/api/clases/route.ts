import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

// Clases semanales fijas
const CLASES_FIJAS = [
  // Lunes
  { dia: 'Lun', hora: '17:30', nombre: 'Yoga' },
  { dia: 'Lun', hora: '19:00', nombre: 'Yoga' },
  // Martes
  { dia: 'Mar', hora: '10:00', nombre: 'Yoga' },
  { dia: 'Mar', hora: '17:30', nombre: 'Yoga' },
  { dia: 'Mar', hora: '19:00', nombre: 'Yoga' },
  // Jueves
  { dia: 'Jue', hora: '10:00', nombre: 'Yoga' },
  { dia: 'Jue', hora: '16:00', nombre: 'Yoga' },
  { dia: 'Jue', hora: '17:30', nombre: 'Yoga' },
  { dia: 'Jue', hora: '19:00', nombre: 'Yoga' },
  // Sábado
  { dia: 'Sab', hora: '09:30', nombre: 'Yoga' },
  { dia: 'Sab', hora: '11:00', nombre: 'Yoga' },
];

export async function GET(request: NextRequest) {
  try {
    // En Cloudflare Pages, el binding D1 está disponible en process.env.DB
    const db = getDB({ DB: (process.env as any).DB });
    if (!db) {
      return NextResponse.json({ error: 'DB not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const result = await db.prepare('SELECT * FROM clase WHERE id = ?')
        .bind(id).first();
      return NextResponse.json(result);
    }

    // Ordenar por día y hora
    const ordenDias: { [key: string]: number } = { 'Lun': 1, 'Mar': 2, 'Jue': 3, 'Sab': 4 };
    const result = await db.prepare('SELECT * FROM clase ORDER BY dia, hora').all();
    const clases = (result.results || []) as any[];
    
    // Ordenar manualmente por día
    clases.sort((a, b) => {
      const diaA = ordenDias[a.dia] || 99;
      const diaB = ordenDias[b.dia] || 99;
      if (diaA !== diaB) return diaA - diaB;
      return a.hora.localeCompare(b.hora);
    });

    return NextResponse.json(clases);
  } catch (error) {
    console.error('Error fetching clases:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// Endpoint para crear una clase individual o inicializar las clases fijas
export async function POST(request: NextRequest) {
  try {
    // En Cloudflare Pages, el binding D1 está disponible en process.env.DB
    const db = getDB({ DB: (process.env as any).DB });
    if (!db) {
      return NextResponse.json({ error: 'DB not available' }, { status: 500 });
    }

    const body = await request.json();
    
    // Si viene con dia, hora, nombre, es una clase individual
    if (body.dia && body.hora && body.nombre) {
      try {
        const result = await db.prepare(
          'INSERT INTO clase (dia, hora, nombre) VALUES (?, ?, ?)'
        ).bind(body.dia, body.hora, body.nombre).run();
        
        const lastRowId = result && typeof result === 'object' 
          ? (result as any).meta?.last_row_id || (result as any).last_row_id
          : null;
        
        return NextResponse.json({ success: true, id: lastRowId });
      } catch (error: any) {
        if (error.message?.includes('UNIQUE constraint')) {
          return NextResponse.json({ error: 'Ya existe una clase con este día y hora' }, { status: 400 });
        }
        throw error;
      }
    }
    
    // Si no viene body, inicializar clases fijas
    // Verificar si ya existen clases
    const existing = await db.prepare('SELECT COUNT(*) as count FROM clase').first();
    if ((existing as any)?.count > 0) {
      return NextResponse.json({ error: 'Las clases ya están inicializadas' }, { status: 400 });
    }

    // Insertar todas las clases fijas
    for (const clase of CLASES_FIJAS) {
      try {
        await db.prepare(
          'INSERT INTO clase (dia, hora, nombre) VALUES (?, ?, ?)'
        ).bind(clase.dia, clase.hora, clase.nombre).run();
      } catch (error: any) {
        // Ignorar errores de duplicados
        if (!error.message?.includes('UNIQUE constraint')) {
          throw error;
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Clases inicializadas' });
  } catch (error: any) {
    console.error('Error creating clases:', error);
    return NextResponse.json({ error: 'Error al crear clases' }, { status: 500 });
  }
}

// Endpoint para eliminar una clase
export async function DELETE(request: NextRequest) {
  try {
    // En Cloudflare Pages, el binding D1 está disponible en process.env.DB
    const db = getDB({ DB: (process.env as any).DB });
    if (!db) {
      return NextResponse.json({ error: 'DB not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await db.prepare('DELETE FROM clase WHERE id = ?').bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting clase:', error);
    return NextResponse.json({ error: 'Error al eliminar clase' }, { status: 500 });
  }
}
