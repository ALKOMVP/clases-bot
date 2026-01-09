import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[POST /api/reservas/temporal] Starting request', { environment: envInfo.environment });
  
  try {
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[POST /api/reservas/temporal] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Si no está disponible en el contexto, intentar desde process.env (OpenNext lo popula)
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[POST /api/reservas/temporal] DB obtained from process.env.DB (OpenNext fallback)');
    }
    
    if (!db) {
      db = getMockDBInstance();
      console.log('[POST /api/reservas/temporal] Using mock DB as fallback');
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const body = await request.json();
    const { usuario_id, clase_id, fecha_clase } = body;

    console.log('[POST /api/reservas/temporal] Request body:', { usuario_id, clase_id, fecha_clase, body });

    if (!usuario_id || !clase_id || !fecha_clase) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos',
        code: 'CAMPOS_FALTANTES',
        received: { usuario_id, clase_id, fecha_clase }
      }, { status: 400 });
    }

    // Convertir clase_id a número si es string
    const claseIdNum = typeof clase_id === 'string' ? parseInt(clase_id, 10) : clase_id;
    const usuarioIdNum = typeof usuario_id === 'string' ? parseInt(usuario_id, 10) : usuario_id;

    // Verificar que el usuario existe y está activo
    const usuario = await db.prepare('SELECT id, activo FROM usuario WHERE id = ?').bind(usuarioIdNum).first();
    
    if (!usuario) {
      return NextResponse.json({ 
        error: 'El alumno no existe',
        code: 'USUARIO_NO_EXISTE'
      }, { status: 400 });
    }

    if (!(usuario as any).activo || (usuario as any).activo === 0) {
      return NextResponse.json({ 
        error: 'No se pueden inscribir alumnos desactivados a clases',
        code: 'USUARIO_DESACTIVADO'
      }, { status: 400 });
    }

    // Obtener cupo máximo (por defecto 35)
    console.log('[POST /api/reservas/temporal] Verificando clase con ID:', claseIdNum, '(original:', clase_id, 'tipo:', typeof clase_id, ')');
    
    // Primero obtener todas las clases para debug
    let todasLasClases: any[] = [];
    try {
      const todasResult = await db.prepare('SELECT * FROM clase ORDER BY id').all();
      todasLasClases = (todasResult.results || []) as any[];
      console.log('[POST /api/reservas/temporal] Todas las clases en BD:', todasLasClases.length, 'clases');
      todasLasClases.forEach((c: any) => {
        console.log(`  - ID: ${c.id} (tipo: ${typeof c.id}), Día: ${c.dia}, Hora: ${c.hora}, Nombre: ${c.nombre}`);
      });
    } catch (debugError) {
      console.error('[POST /api/reservas/temporal] Error al obtener todas las clases:', debugError);
    }
    
    let clase: any;
    try {
      // Intentar con número primero
      let claseResult = await db.prepare('SELECT * FROM clase WHERE id = ?').bind(claseIdNum).first();
      if (!claseResult) {
        // Si no funciona, intentar con string
        console.log('[POST /api/reservas/temporal] No encontrada con número, intentando con string...');
        claseResult = await db.prepare('SELECT * FROM clase WHERE id = ?').bind(clase_id).first();
      }
      clase = claseResult;
      console.log('[POST /api/reservas/temporal] Resultado de búsqueda de clase:', clase ? `Encontrada: ID ${clase.id}, ${clase.dia} ${clase.hora}` : 'NO ENCONTRADA');
    } catch (error: any) {
      console.error('[POST /api/reservas/temporal] Error al buscar clase:', error);
      return NextResponse.json({ 
        error: `Error al buscar la clase: ${error.message}`,
        code: 'ERROR_BUSCAR_CLASE',
        debug: {
          claseIdBuscado: clase_id,
          claseIdNum: claseIdNum,
          clasesDisponibles: todasLasClases.map((c: any) => ({ id: c.id, dia: c.dia, hora: c.hora }))
        }
      }, { status: 500 });
    }
    
    if (!clase) {
      return NextResponse.json({ 
        error: `La clase con ID ${clase_id} no existe en la base de datos. Por favor, inicializa las clases desde la sección "Clases".`,
        code: 'CLASE_NO_EXISTE',
        debug: {
          claseIdBuscado: clase_id,
          claseIdNum: claseIdNum,
          tipoOriginal: typeof clase_id,
          clasesDisponibles: todasLasClases.map((c: any) => ({ id: c.id, dia: c.dia, hora: c.hora, nombre: c.nombre }))
        }
      }, { status: 400 });
    }

    // Verificar cupo disponible
    // Contar reservas fijas (sin fecha_clase)
    const reservasFijas = await db.prepare(`
      SELECT COUNT(DISTINCT usuario_id) as count
      FROM reserva
      WHERE clase_id = ? AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
        AND (es_reasignacion IS NULL OR es_reasignacion = 0)
    `).bind(claseIdNum).first();
    
    const countFijas = (reservasFijas as any)?.count || 0;

    // Contar reservas temporales confirmadas para esta fecha
    const reservasTemporales = await db.prepare(`
      SELECT COUNT(DISTINCT usuario_id) as count
      FROM reserva
      WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
    `).bind(claseIdNum, fecha_clase).first();
    
    const countTemporales = (reservasTemporales as any)?.count || 0;

    // Contar lista de espera para esta clase y fecha
    let listaEsperaCount = 0;
    try {
      const listaEsperaQuery = await db.prepare(`
        SELECT COUNT(*) as count
        FROM lista_espera
        WHERE clase_id = ? AND fecha_clase = ?
      `).bind(clase_id, fecha_clase).first();
      listaEsperaCount = (listaEsperaQuery as any)?.count || 0;
    } catch (error) {
      // Si la tabla no existe, continuar con 0
      console.log('[POST /api/reservas/temporal] Tabla lista_espera no existe, continuando');
    }

    const cupoMaximo = 35;
    const totalConfirmados = countFijas + countTemporales;
    const enListaEspera = totalConfirmados >= cupoMaximo;

    // Verificar si el usuario ya está inscrito (fijo o temporal para esta fecha)
    const existingReserva = await db.prepare(`
      SELECT * FROM reserva 
      WHERE usuario_id = ? AND clase_id = ? 
        AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '' OR fecha_clase = ?)
    `).bind(usuarioIdNum, claseIdNum, fecha_clase).first();

    if (existingReserva) {
      // Si ya existe una reserva fija, no crear temporal
      if (!existingReserva.fecha_clase || existingReserva.fecha_clase === 'null' || existingReserva.fecha_clase === '') {
        return NextResponse.json({ 
          error: 'El alumno ya está inscrito como alumno fijo en esta clase',
          code: 'YA_ES_FIJO'
        }, { status: 400 });
      }
      
      // Si ya existe una reserva temporal para esta fecha
      if (existingReserva.fecha_clase === fecha_clase) {
        return NextResponse.json({ 
          error: 'El alumno ya está inscrito como temporal para esta fecha',
          code: 'YA_ES_TEMPORAL'
        }, { status: 400 });
      }
    }

    if (enListaEspera) {
      // Cupo completo: agregar SOLO a lista de espera, NO crear reserva temporal
      try {
        // Verificar si ya está en lista de espera
        const enLista = await db.prepare(`
          SELECT * FROM lista_espera
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
        `).bind(usuarioIdNum, claseIdNum, fecha_clase).first();

        if (!enLista) {
          // Obtener el siguiente número en lista de espera
          const maxNumero = await db.prepare(`
            SELECT COALESCE(MAX(numero), 0) as max_num FROM lista_espera
            WHERE clase_id = ? AND fecha_clase = ?
          `).bind(claseIdNum, fecha_clase).first();
          
          const siguienteNumero = ((maxNumero as any)?.max_num || 0) + 1;

          await db.prepare(`
            INSERT INTO lista_espera (usuario_id, clase_id, fecha_clase, numero, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
          `).bind(usuarioIdNum, claseIdNum, fecha_clase, siguienteNumero).run();

          console.log('[POST /api/reservas/temporal] Success - Agregado a lista de espera', { usuarioIdNum, claseIdNum, fecha_clase, numero: siguienteNumero });
          return NextResponse.json({ 
            success: true,
            enListaEspera: true,
            mensaje: `Cupo completo. El alumno ha sido agregado a la lista de espera (posición ${siguienteNumero}).`
          });
        } else {
          // Ya está en lista de espera
          return NextResponse.json({ 
            success: true,
            enListaEspera: true,
            mensaje: 'El alumno ya está en la lista de espera.'
          });
        }
      } catch (error: any) {
        // Si hay error con lista_espera, NO crear la reserva temporal
        // El cupo está completo, debe ir a lista de espera o fallar
        console.error('[POST /api/reservas/temporal] Error al agregar a lista_espera:', error.message);
        return NextResponse.json({ 
          error: 'Error al agregar a lista de espera. El cupo está completo.',
          code: 'ERROR_LISTA_ESPERA',
          enListaEspera: true,
          details: error.message
        }, { status: 500 });
      }
    }

    // Cupo disponible: crear reserva temporal (SOLO si NO está en lista de espera)
    // Crear reserva temporal
    await db.prepare(`
      INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
      VALUES (?, ?, ?, 1, datetime('now'))
    `).bind(usuarioIdNum, claseIdNum, fecha_clase).run();

    console.log('[POST /api/reservas/temporal] Success', { usuarioIdNum, claseIdNum, fecha_clase });
    return NextResponse.json({ 
      success: true,
      enListaEspera: false,
      mensaje: 'Alumno agregado como temporal correctamente.'
    });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al agregar alumno temporal',
      { route: '/api/reservas/temporal', method: 'POST', operation: 'add_temporal' }
    );
  }
}

