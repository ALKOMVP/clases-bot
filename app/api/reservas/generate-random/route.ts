import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

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

    // Obtener usuarios y clases
    const usuariosResult = await db.prepare('SELECT * FROM usuario WHERE activo = 1').all();
    const usuarios = (usuariosResult?.results || []) as any[];
    
    const clasesResult = await db.prepare('SELECT * FROM clase').all();
    const clases = (clasesResult?.results || []) as any[];
    
    if (usuarios.length === 0 || clases.length === 0) {
      return NextResponse.json({ 
        error: 'No hay usuarios activos o clases disponibles' 
      }, { status: 400 });
    }

    // Obtener reservas existentes para evitar duplicados
    const reservasResult = await db.prepare('SELECT usuario_id, clase_id FROM reserva').all();
    const reservasExistentes = new Set(
      (reservasResult?.results || []).map((r: any) => `${r.usuario_id}-${r.clase_id}`)
    );

    let reservasCreadas = 0;
    const maxReservas = Math.min(200, usuarios.length * 5); // Máximo 200 reservas o 5 por usuario

    // Generar reservas aleatorias sin límite de cupo
    let intentos = 0;
    const maxIntentos = maxReservas * 5; // Intentar más veces para encontrar combinaciones disponibles
    
    while (reservasCreadas < maxReservas && intentos < maxIntentos) {
      intentos++;
      const usuario = getRandomElement(usuarios);
      const clase = getRandomElement(clases);
      const key = `${usuario.id}-${clase.id}`;
      
      // Verificar que no exista la reserva
      if (!reservasExistentes.has(key)) {
        try {
          await db.prepare(
            'INSERT INTO reserva (usuario_id, clase_id, created_at) VALUES (?, ?, ?)'
          ).bind(usuario.id, clase.id, new Date().toISOString()).run();
          
          reservasExistentes.add(key);
          reservasCreadas++;
        } catch (error: any) {
          // Ignorar errores de duplicados
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${reservasCreadas} reservas creadas aleatoriamente` 
    });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al generar reservas aleatorias',
      { route: '/api/reservas/generate-random', method: 'POST', operation: 'generate_random_reservas' }
    );
  }
}

