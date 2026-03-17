import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

function getEnvVar(name: string): string {
  const cf = (globalThis as any)[Symbol.for('__cloudflare-context__')];
  const v = cf?.env?.[name] ?? (typeof process !== 'undefined' ? process.env?.[name] : undefined);
  return typeof v === 'string' ? v : '';
}

function getConfirmarReservaTemplateName(): string {
  const v = getEnvVar('WHATSAPP_CONFIRMAR_RESERVA_TEMPLATE') || getEnvVar('WHATSAPP_TEMPLATE_NAME');
  if (!v) return 'confirmar_reserva';
  if (v === 'hello_world') return 'confirmar_reserva';
  return v;
}

function normalizarTelefonoWhatsApp(telefono: string): string {
  const n = String(telefono || '').replace(/\D/g, '');
  if (!n) return '';
  let t = n;
  if (t.startsWith('0')) t = t.slice(1);
  if (t.startsWith('54') && !t.startsWith('549')) {
    t = '549' + t.slice(2);
  } else if (!t.startsWith('54') && (t.length === 10 || t.length === 11)) {
    t = '549' + t;
  }
  return t;
}

function buildToCandidates(telefonoRaw: string): string[] {
  const digits = String(telefonoRaw || '').replace(/\D/g, '');
  const candidates = [normalizarTelefonoWhatsApp(telefonoRaw), digits];
  if (candidates[0]?.startsWith('549')) candidates.push('54' + candidates[0].slice(3));
  if (digits.startsWith('54') && !digits.startsWith('549')) candidates.push('549' + digits.slice(2));
  const seen = new Set<string>();
  return candidates
    .map((x) => String(x || '').trim())
    .filter((x) => x && !seen.has(x) && (seen.add(x), true));
}

async function enviarTemplateConfirmarReserva(telefonoRaw: string): Promise<boolean> {
  const token = getEnvVar('WHATSAPP_TOKEN');
  const phoneNumberId = getEnvVar('PHONE_NUMBER_ID');
  const templateName = getConfirmarReservaTemplateName();
  const langCandidates = [
    getEnvVar('WHATSAPP_TEMPLATE_LANG'),
    'es_AR',
    'es',
    'es_ES',
  ].filter(Boolean) as string[];
  const seen = new Set<string>();
  const langs = langCandidates.filter((l) => !seen.has(l) && (seen.add(l), true));
  const toCandidates = buildToCandidates(telefonoRaw);

  if (!token || !phoneNumberId) {
    console.warn('[POST /api/reservas/temporal] WhatsApp envs faltantes para enviar template');
    return false;
  }

  try {
    for (const to of toCandidates) {
      for (const templateLang of langs) {
        const resp = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
              name: templateName,
              language: { code: templateLang },
            },
          }),
        });

        const body = await resp.text();
        if (resp.ok) {
          console.log('[POST /api/reservas/temporal] Template confirmar_reserva enviado', { to, templateName, templateLang });
          return true;
        }

        console.error('[POST /api/reservas/temporal] Error enviando template confirmar_reserva', {
          status: resp.status,
          to,
          templateName,
          templateLang,
          body,
        });
      }
    }

    return false;
  } catch (e: any) {
    console.error('[POST /api/reservas/temporal] Exception enviando template confirmar_reserva', e?.message || e);
    return false;
  }
}

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

    // Limpiar inconsistencias: eliminar de lista_espera a usuarios que ya tienen reserva temporal confirmada
    try {
      await db.prepare(`
        DELETE FROM lista_espera
        WHERE EXISTS (
          SELECT 1 FROM reserva r
          WHERE r.usuario_id = lista_espera.usuario_id
            AND r.clase_id = lista_espera.clase_id
            AND r.fecha_clase = lista_espera.fecha_clase
            AND r.es_reasignacion = 1
        )
        AND lista_espera.clase_id = ? AND lista_espera.fecha_clase = ?
      `).bind(claseIdNum, fecha_clase).run();
    } catch (error: any) {
      // No es crítico si falla la limpieza
      if (!error.message || !error.message.includes('no such table')) {
        console.warn('[POST /api/reservas/temporal] Error en limpieza de inconsistencias (no crítico):', error.message || error);
      }
    }

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

    // No permitir temporales en clase desactivada o en fecha desactivada (si existen columna/tabla)
    let claseRow: any = null;
    try {
      claseRow = await db.prepare('SELECT activa FROM clase WHERE id = ?').bind(claseIdNum).first();
    } catch {
      // Columna activa puede no existir en producción (migración 0010 no aplicada)
    }
    if (claseRow && claseRow.activa === 0) {
      return NextResponse.json({ error: 'Esta clase no está disponible (desactivada).', code: 'CLASE_DESACTIVADA' }, { status: 400 });
    }
    try {
      const desact = await db.prepare('SELECT 1 FROM clase_desactivada WHERE clase_id = ? AND fecha_clase = ?').bind(claseIdNum, fecha_clase).first();
      if (desact) {
        return NextResponse.json({ error: 'Esta fecha no está disponible para inscribir temporales.', code: 'FECHA_DESACTIVADA' }, { status: 400 });
      }
    } catch {
      // Tabla clase_desactivada puede no existir
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
    // Contar reservas fijas (sin fecha_clase) EXCLUYENDO las que tienen cancelación para esta fecha
    const reservasFijas = await db.prepare(`
      SELECT COUNT(DISTINCT r.usuario_id) as count
      FROM reserva r
      WHERE r.clase_id = ? 
        AND (r.fecha_clase IS NULL OR r.fecha_clase = 'null' OR r.fecha_clase = '')
        AND (r.es_reasignacion IS NULL OR r.es_reasignacion = 0)
        AND NOT EXISTS (
          SELECT 1 FROM cancelacion c
          WHERE c.usuario_id = r.usuario_id 
            AND c.clase_id = r.clase_id 
            AND c.fecha_clase = ?
        )
    `).bind(claseIdNum, fecha_clase).first();
    
    const countFijas = (reservasFijas as any)?.count || 0;

    // Contar reservas temporales confirmadas para esta fecha EXCLUYENDO las canceladas
    const reservasTemporales = await db.prepare(`
      SELECT COUNT(DISTINCT r.usuario_id) as count
      FROM reserva r
      WHERE r.clase_id = ? 
        AND r.fecha_clase = ? 
        AND r.es_reasignacion = 1
        AND NOT EXISTS (
          SELECT 1 FROM cancelacion c
          WHERE c.usuario_id = r.usuario_id 
            AND c.clase_id = r.clase_id 
            AND c.fecha_clase = r.fecha_clase
        )
    `).bind(claseIdNum, fecha_clase).first();
    
    const countTemporales = (reservasTemporales as any)?.count || 0;
    
    console.log('[POST /api/reservas/temporal] Conteo de capacidad:', {
      countFijas,
      countTemporales,
      totalConfirmados: countFijas + countTemporales,
      cupoMaximo: 35,
      hayEspacio: (countFijas + countTemporales) < 35
    });

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
    // CORRECCIÓN: Solo ir a lista de espera si el cupo está COMPLETO (>=), no si hay espacio disponible
    // Si totalConfirmados = 34 y cupoMaximo = 35, hay 1 cupo disponible, NO debe ir a lista de espera
    const enListaEspera = totalConfirmados >= cupoMaximo;

    // Verificar si el usuario ya está inscrito (fijo o temporal para esta fecha) EXCLUYENDO las canceladas
    // Verificar si existe una reserva (fija o temporal) que NO tenga cancelación
    // IMPORTANTE: Para temporales, verificar específicamente que no haya cancelación temporal
    const existingReserva = await db.prepare(`
      SELECT r.* FROM reserva r
      WHERE r.usuario_id = ? AND r.clase_id = ? 
        AND (r.fecha_clase IS NULL OR r.fecha_clase = 'null' OR r.fecha_clase = '' OR r.fecha_clase = ?)
        AND NOT EXISTS (
          SELECT 1 FROM cancelacion c
          WHERE c.usuario_id = r.usuario_id
            AND c.clase_id = r.clase_id
            AND c.fecha_clase = ?
        )
    `).bind(usuarioIdNum, claseIdNum, fecha_clase, fecha_clase).first();

    // Verificar también si hay una cancelación temporal específica para esta fecha
    // (esto es importante porque puede haber una reserva temporal que todavía existe pero tiene cancelación)
    const cancelacionTemporalCheck = await db.prepare(`
      SELECT * FROM cancelacion
      WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
        AND (es_temporal = 1 OR es_temporal = true OR COALESCE(es_temporal, 0) = 1)
    `).bind(usuarioIdNum, claseIdNum, fecha_clase).first();

    console.log('[POST /api/reservas/temporal] Verificación de reserva existente:', {
      usuarioIdNum,
      claseIdNum,
      fecha_clase,
      existingReserva: existingReserva ? {
        id: existingReserva.id,
        fecha_clase: existingReserva.fecha_clase,
        es_reasignacion: existingReserva.es_reasignacion
      } : null,
      cancelacionTemporalCheck: cancelacionTemporalCheck ? {
        usuario_id: cancelacionTemporalCheck.usuario_id,
        clase_id: cancelacionTemporalCheck.clase_id,
        fecha_clase: cancelacionTemporalCheck.fecha_clase,
        es_temporal: cancelacionTemporalCheck.es_temporal
      } : null
    });

    if (existingReserva) {
      // Si hay una cancelación temporal, significa que la reserva fue eliminada previamente
      // y deberíamos poder crear una nueva reserva temporal (la cancelación se eliminará más adelante)
      if (cancelacionTemporalCheck) {
        console.log('[POST /api/reservas/temporal] ⚠️ Reserva existe pero tiene cancelación temporal - permitiendo re-inscripción');
        // No retornar error, continuar con la creación (la cancelación se eliminará antes de crear la reserva)
      } else {
        // Si ya existe una reserva fija (sin cancelación), no crear temporal
        if (!existingReserva.fecha_clase || existingReserva.fecha_clase === 'null' || existingReserva.fecha_clase === '') {
          return NextResponse.json({ 
            error: 'El alumno ya está inscrito como alumno fijo en esta clase',
            code: 'YA_ES_FIJO'
          }, { status: 400 });
        }
        
        // Si ya existe una reserva temporal para esta fecha (sin cancelación)
        if (existingReserva.fecha_clase === fecha_clase) {
          return NextResponse.json({ 
            error: 'El alumno ya está inscrito como temporal para esta fecha',
            code: 'YA_ES_TEMPORAL'
          }, { status: 400 });
        }
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
    // IMPORTANTE: Si existe una cancelación temporal previa para este usuario/clase/fecha,
    // eliminarla porque el usuario se está re-inscribiendo
    try {
      const cancelacionTemporal = await db.prepare(`
        SELECT * FROM cancelacion
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
          AND (es_temporal = 1 OR es_temporal = true OR COALESCE(es_temporal, 0) = 1)
      `).bind(usuarioIdNum, claseIdNum, fecha_clase).first();
      
      if (cancelacionTemporal) {
        await db.prepare(`
          DELETE FROM cancelacion
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
            AND (es_temporal = 1 OR es_temporal = true OR COALESCE(es_temporal, 0) = 1)
        `).bind(usuarioIdNum, claseIdNum, fecha_clase).run();
        console.log('[POST /api/reservas/temporal] ✅ Cancelación temporal previa eliminada al re-inscribir usuario', {
          usuarioIdNum,
          claseIdNum,
          fecha_clase
        });
      }
    } catch (cancelError: any) {
      // No es crítico si falla, continuar con la creación de la reserva
      console.warn('[POST /api/reservas/temporal] Error eliminando cancelación temporal previa (no crítico):', cancelError.message || cancelError);
    }

    // Crear reserva temporal
    const insertResult = await db.prepare(`
      INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
      VALUES (?, ?, ?, 1, datetime('now'))
    `).bind(usuarioIdNum, claseIdNum, fecha_clase).run();
    
    console.log('[POST /api/reservas/temporal] ✅ Reserva temporal creada', {
      usuarioIdNum,
      claseIdNum,
      fecha_clase,
      changes: (insertResult as any)?.meta?.changes || 0
    });
    
    // Verificar que la cancelación temporal fue eliminada (si existía)
    const cancelacionVerificacion = await db.prepare(`
      SELECT * FROM cancelacion
      WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
        AND (es_temporal = 1 OR es_temporal = true OR COALESCE(es_temporal, 0) = 1)
    `).bind(usuarioIdNum, claseIdNum, fecha_clase).first();
    
    if (cancelacionVerificacion) {
      console.warn('[POST /api/reservas/temporal] ⚠️ ADVERTENCIA: Cancelación temporal todavía existe después de intentar eliminarla', {
        usuarioIdNum,
        claseIdNum,
        fecha_clase
      });
      // Intentar eliminar nuevamente
      try {
        await db.prepare(`
          DELETE FROM cancelacion
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
            AND (es_temporal = 1 OR es_temporal = true OR COALESCE(es_temporal, 0) = 1)
        `).bind(usuarioIdNum, claseIdNum, fecha_clase).run();
        console.log('[POST /api/reservas/temporal] ✅ Cancelación temporal eliminada en segundo intento');
      } catch (retryError: any) {
        console.error('[POST /api/reservas/temporal] ❌ Error en segundo intento de eliminar cancelación:', retryError.message || retryError);
      }
    } else {
      console.log('[POST /api/reservas/temporal] ✅ Verificación: No hay cancelación temporal (correcto)');
    }

    // Si el alumno estaba en lista de espera para esa clase/fecha, eliminarlo y renumerar
    try {
      const enLista = await db.prepare(`
        SELECT * FROM lista_espera
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
      `).bind(usuarioIdNum, claseIdNum, fecha_clase).first();

      if (enLista) {
        await db.prepare(`
          DELETE FROM lista_espera
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
        `).bind(usuarioIdNum, claseIdNum, fecha_clase).run();

        const listaRestante = await db.prepare(`
          SELECT * FROM lista_espera
          WHERE clase_id = ? AND fecha_clase = ?
          ORDER BY numero ASC
        `).bind(claseIdNum, fecha_clase).all();

        const items = (listaRestante.results || []) as any[];
        for (let i = 0; i < items.length; i++) {
          await db.prepare(`
            UPDATE lista_espera
            SET numero = ?
            WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
          `).bind(i + 1, items[i].usuario_id, claseIdNum, fecha_clase).run();
        }

        // Enviar WhatsApp template de confirmación (sin parámetros)
        const usuarioRow = await db.prepare('SELECT telefono FROM usuario WHERE id = ?').bind(usuarioIdNum).first();
        const telefonoRaw = (usuarioRow as any)?.telefono ? String((usuarioRow as any).telefono) : '';
        if (telefonoRaw) {
          const ok = await enviarTemplateConfirmarReserva(telefonoRaw);
          console.log('[POST /api/reservas/temporal] Resultado envío template (confirmado desde lista):', { ok, usuarioIdNum, claseIdNum, fecha_clase });
        } else {
          console.warn('[POST /api/reservas/temporal] No se pudo enviar template: teléfono vacío', { usuarioIdNum });
        }
      }
    } catch (e: any) {
      // No bloquear la operación principal si lista_espera no existe o hay otro error
      if (!e?.message?.includes('no such table')) {
        console.error('[POST /api/reservas/temporal] Error manejando lista_espera / template:', e?.message || e);
      }
    }

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

