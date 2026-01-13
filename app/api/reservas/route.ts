import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, checkDatabaseAvailability, getEnvironmentInfo } from '@/lib/error-handler';

// OpenNext no requiere runtime = 'edge' explícito

// Configuración WhatsApp (para notificaciones proactivas)
// Nota: en Cloudflare/OpenNext, los env vars suelen estar en process.env,
// pero por seguridad también intentamos leerlos del contexto de Cloudflare.
function getEnvVar(name: string): string {
  const cf = (globalThis as any)[Symbol.for('__cloudflare-context__')];
  const v = cf?.env?.[name] ?? (typeof process !== 'undefined' ? process.env?.[name] : undefined);
  return typeof v === 'string' ? v : '';
}

function getConfirmarReservaTemplateName(): string {
  // Preferimos un env específico para evitar pisadas (en prod ahora WHATSAPP_TEMPLATE_NAME está en hello_world).
  const v =
    getEnvVar('WHATSAPP_CONFIRMAR_RESERVA_TEMPLATE') ||
    getEnvVar('WHATSAPP_TEMPLATE_NAME');
  if (!v) return 'confirmar_reserva';
  // Si está mal configurado en prod (ej: hello_world), forzar el correcto.
  if (v === 'hello_world') return 'confirmar_reserva';
  return v;
}

function normalizarTelefonoWhatsApp(telefono: string): string {
  // Dejar solo dígitos
  const n = String(telefono || '').replace(/\D/g, '');
  if (!n) return '';

  // Heurística AR (si el usuario guarda "011..." o "11...")
  // Recomendación: guardar en DB el número ya en formato WhatsApp (ej: 54911xxxxxxx) para evitar ambigüedad.
  let t = n;
  if (t.startsWith('0')) t = t.slice(1); // 011... -> 11...
  if (t.startsWith('54') && !t.startsWith('549')) {
    // 54xxxxxxxx -> 549xxxxxxxx
    t = '549' + t.slice(2);
  } else if (!t.startsWith('54') && (t.length === 10 || t.length === 11)) {
    // 11xxxxxxxx o 011xxxxxxxx -> 54911xxxxxxxx (aprox)
    t = '549' + t;
  }
  return t;
}

function buildToCandidates(telefonoRaw: string): string[] {
  const digits = String(telefonoRaw || '').replace(/\D/g, '');
  const candidates = [normalizarTelefonoWhatsApp(telefonoRaw), digits];
  // Variante: si vino "549..." también probar "54..." (por si el número real está sin el 9)
  if (candidates[0]?.startsWith('549')) candidates.push('54' + candidates[0].slice(3));
  // Variante: si vino "54..." también probar "549..."
  if (digits.startsWith('54') && !digits.startsWith('549')) candidates.push('549' + digits.slice(2));
  // dedupe y limpiar vacíos
  const seen = new Set<string>();
  return candidates
    .map((x) => String(x || '').trim())
    .filter((x) => x && !seen.has(x) && (seen.add(x), true));
}

function buildLangCandidates(): string[] {
  const envLang = getEnvVar('WHATSAPP_TEMPLATE_LANG');
  const candidates = [envLang, 'es_AR', 'es', 'es_ES'].filter(Boolean) as string[];
  const seen = new Set<string>();
  return candidates.filter((x) => !seen.has(x) && (seen.add(x), true));
}

async function ensureWhatsappTemplateLogTable(db: any) {
  try {
    await db.prepare('SELECT 1 FROM whatsapp_template_log LIMIT 1').first();
    return;
  } catch (e: any) {
    if (!e?.message?.includes('no such table')) return;
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS whatsapp_template_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        usuario_id INTEGER,
        clase_id INTEGER,
        fecha_clase TEXT,
        telefono_raw TEXT,
        to_num TEXT,
        template_name TEXT,
        template_lang TEXT,
        http_status INTEGER,
        ok INTEGER,
        response_text TEXT
      )
    `).run();
  }
}

async function enviarPlantillaConfirmarReserva(params: {
  db: any;
  usuarioId?: number;
  claseId?: number;
  fechaClase?: string;
  telefonoRaw: string;
}): Promise<boolean> {
  const { db, usuarioId, claseId, fechaClase, telefonoRaw } = params;

  const token = getEnvVar('WHATSAPP_TOKEN');
  const phoneNumberId = getEnvVar('PHONE_NUMBER_ID');
  const templateName = getConfirmarReservaTemplateName();

  if (!token || !phoneNumberId) {
    console.warn('[enviarPlantillaConfirmarReserva] WHATSAPP_TOKEN o PHONE_NUMBER_ID no configurados');
    return false;
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const toCandidates = buildToCandidates(telefonoRaw);
  const langCandidates = buildLangCandidates();

  if (toCandidates.length === 0) {
    console.warn('[enviarPlantillaConfirmarReserva] Teléfono vacío, no se puede enviar template');
    return false;
  }

  // Requerimiento: enviar SIEMPRE sin parámetros (sin components)
  try {
    await ensureWhatsappTemplateLogTable(db);

    for (const to of toCandidates) {
      for (const templateLang of langCandidates) {
        const payload = {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: templateLang },
          },
        };

        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const bodyText = await resp.text();
        if (resp.ok) {
          console.log('[enviarPlantillaConfirmarReserva] OK', { to, templateName, templateLang });
          try {
            await db.prepare(`
              INSERT INTO whatsapp_template_log
              (usuario_id, clase_id, fecha_clase, telefono_raw, to_num, template_name, template_lang, http_status, ok, response_text)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            `).bind(
              usuarioId ?? null,
              claseId ?? null,
              fechaClase ?? null,
              telefonoRaw,
              to,
              templateName,
              templateLang,
              resp.status,
              bodyText.slice(0, 900)
            ).run();
          } catch (logErr: any) {
            console.error('[enviarPlantillaConfirmarReserva] Error guardando log (ok):', logErr?.message || logErr);
          }
          return true;
        }

        console.error('[enviarPlantillaConfirmarReserva] Error', {
          status: resp.status,
          to,
          templateName,
          templateLang,
          body: bodyText,
        });

        try {
          await db.prepare(`
            INSERT INTO whatsapp_template_log
            (usuario_id, clase_id, fecha_clase, telefono_raw, to_num, template_name, template_lang, http_status, ok, response_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
          `).bind(
            usuarioId ?? null,
            claseId ?? null,
            fechaClase ?? null,
            telefonoRaw,
            to,
            templateName,
            templateLang,
            resp.status,
            bodyText.slice(0, 900)
          ).run();
        } catch (logErr: any) {
          console.error('[enviarPlantillaConfirmarReserva] Error guardando log (error):', logErr?.message || logErr);
        }
      }
    }

    return false;
  } catch (e: any) {
    console.error('[enviarPlantillaConfirmarReserva] Exception:', e?.message || e);
    return false;
  }
}

/**
 * Función auxiliar para limpiar inconsistencias: eliminar de lista_espera a usuarios
 * que ya tienen reserva temporal confirmada para una fecha/clase específica
 */
async function limpiarListaEsperaInconsistencias(db: any, claseIdNum?: number, fechaClase?: string): Promise<number> {
  try {
    // Primero, obtener los registros inconsistentes para logging
    let selectQuery = `
      SELECT le.*, r.usuario_id as reserva_usuario_id
      FROM lista_espera le
      INNER JOIN reserva r ON (
        r.usuario_id = le.usuario_id
        AND r.clase_id = le.clase_id
        AND r.fecha_clase = le.fecha_clase
        AND r.es_reasignacion = 1
      )
    `;
    const selectParams: any[] = [];

    if (claseIdNum && fechaClase) {
      selectQuery += ' WHERE le.clase_id = ? AND le.fecha_clase = ?';
      selectParams.push(claseIdNum, fechaClase);
    }

    let inconsistencias: any[] = [];
    try {
      const selectResult = await db.prepare(selectQuery).bind(...selectParams).all();
      inconsistencias = (selectResult.results || []) as any[];
      if (inconsistencias.length > 0) {
        console.log(`[limpiarListaEsperaInconsistencias] 🔍 Encontradas ${inconsistencias.length} inconsistencias:`, 
          inconsistencias.map((item: any) => ({
            usuario_id: item.usuario_id,
            clase_id: item.clase_id,
            fecha_clase: item.fecha_clase
          }))
        );
      }
    } catch (selectError: any) {
      console.warn('[limpiarListaEsperaInconsistencias] Error al consultar inconsistencias:', selectError.message || selectError);
    }

    // Ahora eliminar las inconsistencias
    let deleteQuery = `
      DELETE FROM lista_espera
      WHERE EXISTS (
        SELECT 1 FROM reserva r
        WHERE r.usuario_id = lista_espera.usuario_id
          AND r.clase_id = lista_espera.clase_id
          AND r.fecha_clase = lista_espera.fecha_clase
          AND r.es_reasignacion = 1
      )
    `;
    const deleteParams: any[] = [];

    if (claseIdNum && fechaClase) {
      deleteQuery += ' AND lista_espera.clase_id = ? AND lista_espera.fecha_clase = ?';
      deleteParams.push(claseIdNum, fechaClase);
    }

    const result = await db.prepare(deleteQuery).bind(...deleteParams).run();
    const deleted = (result as any)?.changes || 0;

    if (deleted > 0) {
      console.log(`[limpiarListaEsperaInconsistencias] ✅ Eliminados ${deleted} registros inconsistentes de lista_espera`, {
        claseIdNum,
        fechaClase,
        detalles: inconsistencias.slice(0, 5).map((item: any) => ({
          usuario_id: item.usuario_id,
          clase_id: item.clase_id,
          fecha_clase: item.fecha_clase
        }))
      });
    } else if (inconsistencias.length === 0) {
      console.log(`[limpiarListaEsperaInconsistencias] ✅ No se encontraron inconsistencias`, { claseIdNum, fechaClase });
    }

    return deleted;
  } catch (error: any) {
    // Si la tabla no existe, no es un error crítico
    if (error.message && error.message.includes('no such table')) {
      console.log('[limpiarListaEsperaInconsistencias] Tabla lista_espera no existe, no hay nada que limpiar');
      return 0;
    }
    console.error('[limpiarListaEsperaInconsistencias] Error:', error.message || error);
    return 0;
  }
}

/**
 * Función auxiliar para verificar y promover automáticamente usuarios de lista de espera
 * cuando hay cupo disponible. Se ejecuta en bucle hasta que no haya más cupo o no haya más personas en lista.
 */
async function verificarYPromoverAutomaticamente(db: any, claseIdNum: number, fechaClase: string): Promise<number> {
  let totalPromovidos = 0;
  let maxIteraciones = 10; // Evitar loops infinitos
  let iteracion = 0;
  let limpiezaEjecutada = false; // Flag para evitar limpieza redundante

  while (iteracion < maxIteraciones) {
    iteracion++;
    
    // Limpiar inconsistencias solo en la primera iteración
    if (!limpiezaEjecutada) {
      await limpiarListaEsperaInconsistencias(db, claseIdNum, fechaClase);
      limpiezaEjecutada = true;
    }

    // Verificar cupo actual
    const reservasFijasQuery = await db.prepare(`
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
    `).bind(claseIdNum, fechaClase).first();
    
    const countFijas = (reservasFijasQuery as any)?.count || 0;

    const reservasTemporales = await db.prepare(`
      SELECT COUNT(DISTINCT r.usuario_id) as count
      FROM reserva r
      WHERE r.clase_id = ? AND r.fecha_clase = ? AND r.es_reasignacion = 1
        AND NOT EXISTS (
          SELECT 1 FROM cancelacion c
          WHERE c.usuario_id = r.usuario_id 
            AND c.clase_id = r.clase_id 
            AND c.fecha_clase = r.fecha_clase
        )
    `).bind(claseIdNum, fechaClase).first();
    
    const countTemporales = (reservasTemporales as any)?.count || 0;

    const cupoMaximo = 35;
    const totalConfirmados = countFijas + countTemporales;
    const cupoDisponible = cupoMaximo - totalConfirmados;

    // Si no hay cupo disponible, salir del bucle
    if (cupoDisponible <= 0) {
      console.log(`[verificarYPromoverAutomaticamente] No hay cupo disponible para ${fechaClase}`, {
        totalConfirmados,
        cupoMaximo,
        cupoDisponible
      });
      break;
    }

    // Verificar si hay alguien en lista de espera
    const primeroEnLista = await db.prepare(`
      SELECT * FROM lista_espera
      WHERE clase_id = ? AND fecha_clase = ?
      ORDER BY numero ASC
      LIMIT 1
    `).bind(claseIdNum, fechaClase).first();

    if (!primeroEnLista) {
      console.log(`[verificarYPromoverAutomaticamente] No hay nadie en lista de espera para ${fechaClase}`);
      break;
    }

    const siguienteUsuarioId = (primeroEnLista as any).usuario_id;
    const numeroEnLista = (primeroEnLista as any).numero;

    console.log(`[verificarYPromoverAutomaticamente] 🔄 Promoviendo usuario de lista de espera (iteración ${iteracion}):`, {
      usuario_id: siguienteUsuarioId,
      numero_en_lista: numeroEnLista,
      cupo_disponible: cupoDisponible,
      total_confirmados: totalConfirmados
    });

    // Verificar que el usuario no tenga ya una reserva temporal
    const reservaExistente = await db.prepare(`
      SELECT * FROM reserva 
      WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
    `).bind(siguienteUsuarioId, claseIdNum, fechaClase).first();

    if (!reservaExistente) {
      // Crear reserva temporal
      await db.prepare(`
        INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
        VALUES (?, ?, ?, 1, datetime('now'))
      `).bind(siguienteUsuarioId, claseIdNum, fechaClase).run();

      // IMPORTANTE: Consumir 1 clase a recuperar si el usuario tiene disponibles
      // (similar a como se hace en el webhook cuando se reserva usando clase para recuperar)
      try {
        const recuperar = await db.prepare(`
          SELECT id FROM clase_recuperar
          WHERE usuario_id = ? AND usado = 0 AND fecha_vencimiento >= date('now')
          ORDER BY fecha_vencimiento ASC, id ASC
          LIMIT 1
        `).bind(siguienteUsuarioId).first();

        if (recuperar?.id) {
          await db.prepare(`
            UPDATE clase_recuperar
            SET usado = 1, fecha_uso = date('now')
            WHERE id = ?
          `).bind(recuperar.id).run();
          console.log(`[verificarYPromoverAutomaticamente] ✅ Clase para recuperar consumida para usuario ${siguienteUsuarioId}`, {
            clase_recuperar_id: recuperar.id
          });
        }
      } catch (recuperarError: any) {
        // No es crítico si falla, solo loguear
        if (!recuperarError?.message?.includes('no such table')) {
          console.warn('[verificarYPromoverAutomaticamente] Error consumiendo clase para recuperar (no crítico):', recuperarError.message || recuperarError);
        }
      }

      // Eliminar de lista de espera
      await db.prepare(`
        DELETE FROM lista_espera
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
      `).bind(siguienteUsuarioId, claseIdNum, fechaClase).run();

      // Reordenar números de lista de espera
      const listaRestante = await db.prepare(`
        SELECT * FROM lista_espera
        WHERE clase_id = ? AND fecha_clase = ?
        ORDER BY numero ASC
      `).bind(claseIdNum, fechaClase).all();

      const items = (listaRestante.results || []) as any[];
      for (let i = 0; i < items.length; i++) {
        await db.prepare(`
          UPDATE lista_espera
          SET numero = ?
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
        `).bind(i + 1, items[i].usuario_id, claseIdNum, fechaClase).run();
      }

      // Notificar por WhatsApp
      try {
        const usuario = await db.prepare('SELECT telefono FROM usuario WHERE id = ?')
          .bind(siguienteUsuarioId)
          .first();

        const telefonoRaw = (usuario as any)?.telefono ? String((usuario as any).telefono) : '';
        if (telefonoRaw) {
          await enviarPlantillaConfirmarReserva({
            db,
            usuarioId: siguienteUsuarioId,
            claseId: claseIdNum,
            fechaClase,
            telefonoRaw,
          });
        }
      } catch (e: any) {
        console.error('[verificarYPromoverAutomaticamente] Error notificando por WhatsApp:', e?.message || e);
      }

      totalPromovidos++;
      console.log(`[verificarYPromoverAutomaticamente] ✅ Usuario promovido exitosamente (total: ${totalPromovidos})`);
    } else {
      // Si ya tiene reserva, solo eliminarlo de lista de espera
      await db.prepare(`
        DELETE FROM lista_espera
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
      `).bind(siguienteUsuarioId, claseIdNum, fechaClase).run();
      console.log(`[verificarYPromoverAutomaticamente] ⚠️ Usuario ya tenía reserva, eliminado de lista de espera`);
    }
  }

  if (totalPromovidos > 0) {
    console.log(`[verificarYPromoverAutomaticamente] ✅ Promoción automática completada: ${totalPromovidos} usuario(s) promovido(s) para ${fechaClase}`);
  }

  return totalPromovidos;
}

/**
 * Función auxiliar para promover el siguiente usuario de la lista de espera a reserva temporal confirmada
 * cuando hay cupo disponible para una fecha específica
 */
async function promoverDeListaEspera(db: any, claseIdNum: number, fechaClase: string): Promise<void> {
  // Primero limpiar inconsistencias para esta fecha/clase
  await limpiarListaEsperaInconsistencias(db, claseIdNum, fechaClase);
  try {
    // Verificar cupo actual para esta fecha
    const reservasFijasQuery = await db.prepare(`
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
    `).bind(claseIdNum, fechaClase).first();
    
    const countFijas = (reservasFijasQuery as any)?.count || 0;

    const reservasTemporales = await db.prepare(`
      SELECT COUNT(DISTINCT r.usuario_id) as count
      FROM reserva r
      WHERE r.clase_id = ? AND r.fecha_clase = ? AND r.es_reasignacion = 1
        AND NOT EXISTS (
          SELECT 1 FROM cancelacion c
          WHERE c.usuario_id = r.usuario_id 
            AND c.clase_id = r.clase_id 
            AND c.fecha_clase = r.fecha_clase
        )
    `).bind(claseIdNum, fechaClase).first();
    
    const countTemporales = (reservasTemporales as any)?.count || 0;

    const cupoMaximo = 35;
    const totalConfirmados = countFijas + countTemporales;
    const cupoDisponible = cupoMaximo - totalConfirmados;

    console.log(`[promoverDeListaEspera] Cupo para fecha ${fechaClase}:`, { 
      countFijas, 
      countTemporales, 
      totalConfirmados, 
      cupoDisponible,
      cupoMaximo 
    });

    // Si hay cupo disponible, promover al primero en lista de espera
    if (cupoDisponible > 0) {
      // Obtener el primero en lista de espera
      let primeroEnLista = await db.prepare(`
        SELECT * FROM lista_espera
        WHERE clase_id = ? AND fecha_clase = ?
        ORDER BY numero ASC
        LIMIT 1
      `).bind(claseIdNum, fechaClase).first();

      if (primeroEnLista) {
        const siguienteUsuarioId = (primeroEnLista as any).usuario_id;
        const numeroEnLista = (primeroEnLista as any).numero;
        
        console.log(`[promoverDeListaEspera] ✅ Usuario encontrado en lista de espera para ${fechaClase}:`, { 
          usuario_id: siguienteUsuarioId,
          numero_en_lista: numeroEnLista,
          cupo_disponible: cupoDisponible
        });

        // Verificar que el usuario no tenga ya una reserva temporal para esta fecha
        const reservaExistente = await db.prepare(`
          SELECT * FROM reserva 
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
        `).bind(siguienteUsuarioId, claseIdNum, fechaClase).first();

        if (!reservaExistente) {
          // Crear reserva temporal para el usuario promovido
          const insertResult = await db.prepare(`
            INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
            VALUES (?, ?, ?, 1, datetime('now'))
          `).bind(siguienteUsuarioId, claseIdNum, fechaClase).run();

          console.log(`[promoverDeListaEspera] ✅ Reserva temporal creada para ${fechaClase}`, {
            usuario_id: siguienteUsuarioId,
            clase_id: claseIdNum,
            fecha_clase: fechaClase
          });

          // IMPORTANTE: Consumir 1 clase a recuperar si el usuario tiene disponibles
          // (similar a como se hace en el webhook cuando se reserva usando clase para recuperar)
          try {
            const recuperar = await db.prepare(`
              SELECT id FROM clase_recuperar
              WHERE usuario_id = ? AND usado = 0 AND fecha_vencimiento >= date('now')
              ORDER BY fecha_vencimiento ASC, id ASC
              LIMIT 1
            `).bind(siguienteUsuarioId).first();

            if (recuperar?.id) {
              await db.prepare(`
                UPDATE clase_recuperar
                SET usado = 1, fecha_uso = date('now')
                WHERE id = ?
              `).bind(recuperar.id).run();
              console.log(`[promoverDeListaEspera] ✅ Clase para recuperar consumida para usuario ${siguienteUsuarioId}`, {
                clase_recuperar_id: recuperar.id
              });
            } else {
              console.log(`[promoverDeListaEspera] ℹ️ Usuario ${siguienteUsuarioId} no tiene clases para recuperar disponibles`);
            }
          } catch (recuperarError: any) {
            // No es crítico si falla, solo loguear
            if (!recuperarError?.message?.includes('no such table')) {
              console.warn('[promoverDeListaEspera] Error consumiendo clase para recuperar (no crítico):', recuperarError.message || recuperarError);
            }
          }

          // Eliminar de lista de espera
          await db.prepare(`
            DELETE FROM lista_espera
            WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
          `).bind(siguienteUsuarioId, claseIdNum, fechaClase).run();

          // Notificar por WhatsApp al alumno: su reserva quedó confirmada
          try {
            const usuario = await db.prepare('SELECT telefono FROM usuario WHERE id = ?')
              .bind(siguienteUsuarioId)
              .first();

            const telefonoRaw = (usuario as any)?.telefono ? String((usuario as any).telefono) : '';
            if (!telefonoRaw) {
              console.warn('[promoverDeListaEspera] No se pudo notificar: teléfono vacío', { usuario_id: siguienteUsuarioId });
            } else {
              const ok = await enviarPlantillaConfirmarReserva({
                db,
                usuarioId: siguienteUsuarioId,
                claseId: claseIdNum,
                fechaClase,
                telefonoRaw,
              });
              console.log('[promoverDeListaEspera] Resultado envío template (nuevo confirmado):', { ok, usuario_id: siguienteUsuarioId, clase_id: claseIdNum, fecha_clase: fechaClase });
            }
          } catch (e: any) {
            console.error('[promoverDeListaEspera] Error notificando por WhatsApp:', e?.message || e);
          }

          // Reordenar números de lista de espera (renumerar desde 1)
          const listaRestante = await db.prepare(`
            SELECT * FROM lista_espera
            WHERE clase_id = ? AND fecha_clase = ?
            ORDER BY numero ASC
          `).bind(claseIdNum, fechaClase).all();

          const items = (listaRestante.results || []) as any[];
          
          for (let i = 0; i < items.length; i++) {
            await db.prepare(`
              UPDATE lista_espera
              SET numero = ?
              WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
            `).bind(i + 1, items[i].usuario_id, claseIdNum, fechaClase).run();
          }

          console.log(`[promoverDeListaEspera] ✅ Usuario promovido exitosamente para ${fechaClase}`, {
            usuario_id: siguienteUsuarioId,
            usuarios_restantes_en_lista: items.length
          });
        } else {
          console.log(`[promoverDeListaEspera] ⚠️ Usuario ya tiene reserva para ${fechaClase}, eliminando de lista de espera...`);
          // Si ya tiene reserva, solo eliminarlo de la lista de espera
          await db.prepare(`
            DELETE FROM lista_espera
            WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
          `).bind(siguienteUsuarioId, claseIdNum, fechaClase).run();

          // Requerimiento: si "por cualquier motivo" pasó a confirmado (ya existe reserva),
          // también notificar con la plantilla.
          try {
            const usuario = await db.prepare('SELECT telefono FROM usuario WHERE id = ?')
              .bind(siguienteUsuarioId)
              .first();
            const telefonoRaw = (usuario as any)?.telefono ? String((usuario as any).telefono) : '';
            if (telefonoRaw) {
              const ok = await enviarPlantillaConfirmarReserva({
                db,
                usuarioId: siguienteUsuarioId,
                claseId: claseIdNum,
                fechaClase,
                telefonoRaw,
              });
              console.log('[promoverDeListaEspera] Resultado envío template (ya tenía reserva):', { ok, usuario_id: siguienteUsuarioId, clase_id: claseIdNum, fecha_clase: fechaClase });
            } else {
              console.warn('[promoverDeListaEspera] No se pudo notificar (reserva ya existente): teléfono vacío', { usuario_id: siguienteUsuarioId });
            }
          } catch (e: any) {
            console.error('[promoverDeListaEspera] Error notificando (reserva ya existente):', e?.message || e);
          }
        }
      } else {
        console.log(`[promoverDeListaEspera] No hay usuarios en lista de espera para ${fechaClase}`);
      }
    } else {
      console.log(`[promoverDeListaEspera] No hay cupo disponible para ${fechaClase} (${totalConfirmados}/${cupoMaximo})`);
    }
  } catch (error: any) {
    console.error(`[promoverDeListaEspera] Error procesando fecha ${fechaClase}:`, error.message);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/reservas] Starting request', { environment: envInfo.environment });
  
  try {
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    // Primero intentar desde el contexto de Cloudflare (AsyncLocalStorage)
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[GET /api/reservas] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Si no está disponible en el contexto, intentar desde process.env (OpenNext lo popula)
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[GET /api/reservas] DB obtained from process.env.DB (OpenNext fallback)');
    }
    
    if (!db) {
      // Si no hay DB disponible, usar mock como fallback
      db = getMockDBInstance();
      console.log('[GET /api/reservas] Using mock DB as fallback');
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');
    const clase_id = searchParams.get('clase_id');

    const fecha_clase = searchParams.get('fecha_clase');
    const include_reasignaciones = searchParams.get('include_reasignaciones') === 'true';

    // Limpiar inconsistencias y promover automáticamente cuando hay cupo disponible
    // OPTIMIZACIÓN: Solo ejecutar una vez, no múltiples veces
    try {
      if (fecha_clase && clase_id) {
        // Limpiar inconsistencias y promover para esta fecha/clase específica
        // verificarYPromoverAutomaticamente ya incluye limpieza, no duplicar
        await verificarYPromoverAutomaticamente(db, Number(clase_id), fecha_clase);
      } else {
        // Si no hay filtros específicos, solo limpiar inconsistencias globales (sin promoción)
        // La promoción requiere fecha/clase específica
        await limpiarListaEsperaInconsistencias(db);
      }
    } catch (error: any) {
      // No es crítico si falla la limpieza, continuar con la consulta
      console.warn('[GET /api/reservas] Error en limpieza/promoción automática (no crítico):', error.message || error);
    }

    let query = `
      SELECT r.*, u.nombre, u.apellido, u.telefono, c.dia, c.hora, c.nombre as clase_nombre
      FROM reserva r
      JOIN usuario u ON r.usuario_id = u.id
      JOIN clase c ON r.clase_id = c.id
      WHERE u.activo = 1
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
    if (fecha_clase) {
      // Si se especifica fecha_clase, incluir:
      // 1. Reservas fijas (sin fecha_clase) EXCEPTO las que tienen cancelación para esta fecha
      // 2. Reservas temporales para esa fecha específica
      conditions.push('(r.fecha_clase IS NULL OR r.fecha_clase = \'null\' OR r.fecha_clase = \'\' OR r.fecha_clase = ?)');
      params.push(fecha_clase);
      
      // EXCLUIR reservas que tienen cancelación para esta fecha específica
      // Aplica tanto a reservas fijas como temporales
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM cancelacion c
        WHERE c.usuario_id = r.usuario_id 
          AND c.clase_id = r.clase_id 
          AND c.fecha_clase = ?
      )`);
      params.push(fecha_clase);
    } else if (!include_reasignaciones) {
      // Si no se incluyen reasignaciones, solo mostrar reservas fijas
      conditions.push('(r.fecha_clase IS NULL OR r.fecha_clase = \'null\' OR r.fecha_clase = \'\' OR r.es_reasignacion = 0 OR r.es_reasignacion IS NULL)');
    }
    
    // Si include_reasignaciones es true y no hay fecha_clase, mostrar todas las reservas (fijas y temporales)

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    // Ordenar por día y hora
    const ordenDias: { [key: string]: number } = { 'Lun': 1, 'Mar': 2, 'Jue': 3, 'Sab': 4 };
    query += ' ORDER BY c.dia, c.hora, u.apellido, u.nombre';

    let reservas: any[] = [];
    try {
      const stmt = db.prepare(query);
      const result = params.length > 0 
        ? await stmt.bind(...params).all()
        : await stmt.all();
      
      reservas = (result.results || []) as any[];
    } catch (error: any) {
      console.error('[GET /api/reservas] Error ejecutando query:', error);
      // Si hay error, retornar array vacío en lugar de fallar
      reservas = [];
    }
    
    // Ordenar manualmente por día
    reservas.sort((a, b) => {
      const diaA = ordenDias[a.dia] || 99;
      const diaB = ordenDias[b.dia] || 99;
      if (diaA !== diaB) return diaA - diaB;
      return a.hora.localeCompare(b.hora);
    });

    console.log('[GET /api/reservas] Success', { count: reservas.length });
    return NextResponse.json(reservas);
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al obtener reservas',
      { route: '/api/reservas', method: 'GET', operation: 'fetch_reservas' }
    );
  }
}

export async function POST(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[POST /api/reservas] Starting request', { environment: envInfo.environment });
  
  try {
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[POST /api/reservas] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Solo usar mock DB si NO hay DB real disponible Y estamos en desarrollo
    if (!db) {
      const isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        db = getMockDBInstance();
        console.log('[POST /api/reservas] Using mock DB (development only)');
      } else {
        console.error('[POST /api/reservas] DB not available in production');
        return NextResponse.json({ 
          error: 'Base de datos no disponible',
          details: 'El binding de D1 no está configurado correctamente'
        }, { status: 503 });
      }
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { usuario_id, clase_id } = await request.json();

    if (!usuario_id || !clase_id) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Verificar que el usuario existe y está activo
    const usuario = await db.prepare('SELECT id, activo FROM usuario WHERE id = ?').bind(usuario_id).first();
    
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

    // Verificar si el usuario ya está inscrito en esta clase
    const existingReserva = await db.prepare(
      'SELECT * FROM reserva WHERE usuario_id = ? AND clase_id = ?'
    ).bind(usuario_id, clase_id).first();

    if (existingReserva) {
      return NextResponse.json({ 
        error: 'El alumno ya está inscrito en esta clase',
        code: 'ALREADY_ENROLLED'
      }, { status: 400 });
    }

    await db.prepare(
      'INSERT INTO reserva (usuario_id, clase_id) VALUES (?, ?)'
    ).bind(usuario_id, clase_id).run();

    console.log('[POST /api/reservas] Success', { usuario_id, clase_id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al crear reserva',
      { route: '/api/reservas', method: 'POST', operation: 'create_reserva' }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[DELETE /api/reservas] Starting request', { environment: envInfo.environment });
  
  try {
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[DELETE /api/reservas] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Si no está disponible en el contexto, intentar desde process.env (OpenNext lo popula)
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[DELETE /api/reservas] DB obtained from process.env.DB (OpenNext fallback)');
    }
    
    if (!db) {
      // Si no hay DB disponible, usar mock como fallback
      db = getMockDBInstance();
      console.log('[DELETE /api/reservas] Using mock DB as fallback');
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');
    const clase_id = searchParams.get('clase_id');
    const fecha_clase = searchParams.get('fecha_clase');

    if (!usuario_id || !clase_id) {
      return NextResponse.json({ error: 'Usuario ID y Clase ID requeridos' }, { status: 400 });
    }

    const claseIdNum = typeof clase_id === 'string' ? parseInt(clase_id, 10) : clase_id;
    
    // Determinar la fecha_clase para evaluar lista de espera después
    // Si fecha_clase se especifica, significa que se está eliminando para una fecha específica
    // (ya sea una reserva temporal o una reserva fija que se cancela para esa fecha)
    // Solo promovemos si hay una fecha_clase específica
    let fechaClaseParaLista: string | null = fecha_clase;

    // Si se especifica fecha_clase, puede ser:
    // 1. Eliminar reserva temporal para esa fecha específica
    // 2. Cancelar reserva fija solo para esa fecha (desde el modal del calendario)
    if (fecha_clase) {
      // Intentar eliminar reserva temporal primero
      const reservaTemporal = await db.prepare(`
        SELECT * FROM reserva 
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
      `).bind(usuario_id, clase_id, fecha_clase).first();
      
      if (reservaTemporal) {
        // Eliminar reserva temporal y crear registro de cancelación temporal
        const deleteResult = await db.prepare(`
          DELETE FROM reserva 
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
        `).bind(usuario_id, clase_id, fecha_clase).run();
        console.log('[DELETE /api/reservas] Reserva temporal eliminada', { 
          usuario_id, 
          clase_id, 
          fecha_clase,
          changes: (deleteResult as any)?.meta?.changes || 0
        });

        // Crear registro de cancelación temporal en la tabla cancelacion
        try {
          // Asegurar que la tabla cancelacion existe y tiene columna es_temporal
          try {
            await db.prepare('SELECT es_temporal FROM cancelacion LIMIT 1').first();
          } catch (colCheckError: any) {
            if (colCheckError.message && colCheckError.message.includes('no such column')) {
              try {
                await db.prepare('ALTER TABLE cancelacion ADD COLUMN es_temporal INTEGER DEFAULT 0').run();
                console.log('[DELETE /api/reservas] ✅ Columna es_temporal agregada a tabla cancelacion');
              } catch (alterError: any) {
                // Ignorar si ya existe
                if (!alterError.message?.includes('duplicate column')) {
                  console.warn('[DELETE /api/reservas] Error agregando columna es_temporal:', alterError.message);
                }
              }
            }
          }

          // Verificar si ya existe cancelación
          const cancelacionExistente = await db.prepare(`
            SELECT * FROM cancelacion
            WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
          `).bind(Number(usuario_id), Number(clase_id), fecha_clase).first();

          if (!cancelacionExistente) {
            await db.prepare(`
              INSERT INTO cancelacion (usuario_id, clase_id, fecha_clase, es_temporal, created_at)
              VALUES (?, ?, ?, 1, datetime('now'))
            `).bind(Number(usuario_id), Number(clase_id), fecha_clase).run();
            console.log('[DELETE /api/reservas] ✅ Cancelación temporal registrada en tabla cancelacion');
          }
        } catch (cancelError: any) {
          console.warn('[DELETE /api/reservas] Error registrando cancelación temporal (no crítico):', cancelError.message || cancelError);
        }
      } else {
        // Verificar si hay una reserva fija (sin fecha_clase)
        const reservaFija = await db.prepare(`
          SELECT * FROM reserva 
          WHERE usuario_id = ? AND clase_id = ? 
            AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
            AND (es_reasignacion IS NULL OR es_reasignacion = 0)
        `).bind(usuario_id, clase_id).first();
        
        if (reservaFija) {
          // Hay una reserva fija, pero se está cancelando solo para esta fecha específica
          // Crear una entrada en la tabla cancelacion para esta fecha específica
          // No eliminamos la reserva fija (sigue válida para otras fechas)
          console.log('[DELETE /api/reservas] 🔍 Reserva fija existe, creando cancelación para fecha específica:', {
            usuario_id,
            tipo_usuario_id: typeof usuario_id,
            clase_id,
            tipo_clase_id: typeof clase_id,
            fecha_clase
          });
          
          try {
            // Asegurar que usuario_id y clase_id sean números
            const usuarioIdNum = Number(usuario_id);
            const claseIdNum = Number(clase_id);
            
            // Verificar si la tabla cancelacion existe, si no, crearla
            try {
              await db.prepare(`SELECT 1 FROM cancelacion LIMIT 1`).first();
            } catch (tableCheckError: any) {
              if (tableCheckError.message && tableCheckError.message.includes('no such table')) {
                console.log('[DELETE /api/reservas] Tabla cancelacion no existe, creándola...');
                await db.prepare(`
                  CREATE TABLE IF NOT EXISTS cancelacion (
                    usuario_id INTEGER NOT NULL,
                    clase_id INTEGER NOT NULL,
                    fecha_clase TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    PRIMARY KEY (usuario_id, clase_id, fecha_clase),
                    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
                    FOREIGN KEY (clase_id) REFERENCES clase(id) ON DELETE CASCADE
                  )
                `).run();
                console.log('[DELETE /api/reservas] ✅ Tabla cancelacion creada');
              }
            }
            
            // Verificar si ya existe una cancelación para esta combinación
            const cancelacionExistente = await db.prepare(`
              SELECT * FROM cancelacion
              WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
            `).bind(usuarioIdNum, claseIdNum, fecha_clase).first();
            
            if (!cancelacionExistente) {
              // Crear la cancelación solo si no existe
              const insertCancelacion = await db.prepare(`
                INSERT INTO cancelacion (usuario_id, clase_id, fecha_clase, created_at)
                VALUES (?, ?, ?, datetime('now'))
              `).bind(usuarioIdNum, claseIdNum, fecha_clase).run();
              
              console.log('[DELETE /api/reservas] ✅ Cancelación creada exitosamente para reserva fija', {
                usuario_id: usuarioIdNum,
                clase_id: claseIdNum,
                fecha_clase,
                changes: (insertCancelacion as any)?.meta?.changes || 0,
                lastRowId: (insertCancelacion as any)?.meta?.last_row_id
              });
              
              // Verificar que se creó correctamente
              const verificacion = await db.prepare(`
                SELECT * FROM cancelacion
                WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
              `).bind(usuarioIdNum, claseIdNum, fecha_clase).first();
              
              if (verificacion) {
                console.log('[DELETE /api/reservas] ✅ Verificación: Cancelación existe en BD', verificacion);
              } else {
                console.error('[DELETE /api/reservas] ❌ ERROR: Cancelación NO se encontró después de crearla');
              }
            } else {
              console.log('[DELETE /api/reservas] ⚠️ Cancelación ya existe para esta combinación:', cancelacionExistente);
            }
          } catch (cancelacionError: any) {
            console.error('[DELETE /api/reservas] ❌ ERROR al crear cancelación:', {
              message: cancelacionError.message,
              stack: cancelacionError.stack,
              usuario_id,
              clase_id,
              fecha_clase
            });
            // No lanzar el error, solo loguearlo para que el flujo continúe
          }
          
          // Verificar lista de espera porque se liberó un cupo para esta fecha
          console.log('[DELETE /api/reservas] Cancelación creada, verificando lista de espera para esta fecha');
        } else {
          console.log('[DELETE /api/reservas] No se encontró reserva temporal ni fija para eliminar');
        }
      }
      fechaClaseParaLista = fecha_clase;
    } else {
      // Eliminar reserva fija completamente (sin fecha_clase)
      console.log('[DELETE /api/reservas] 🔍 Eliminando reserva fija permanente, claseIdNum:', claseIdNum, 'tipo:', typeof claseIdNum);
      
      const deleteResult = await db.prepare(`
        DELETE FROM reserva 
        WHERE usuario_id = ? AND clase_id = ? 
          AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
          AND (es_reasignacion IS NULL OR es_reasignacion = 0)
      `).bind(usuario_id, clase_id).run();
      
      console.log('[DELETE /api/reservas] ✅ Reserva fija eliminada, cambios:', (deleteResult as any)?.meta?.changes || 0);
      
      // Obtener información de la clase para calcular fechas futuras
      console.log('[DELETE /api/reservas] 🔍 Buscando información de clase con ID:', claseIdNum);
      const claseInfo = await db.prepare('SELECT dia, hora, nombre FROM clase WHERE id = ?').bind(claseIdNum).first();
      console.log('[DELETE /api/reservas] 🔍 Resultado de búsqueda de clase:', claseInfo ? 'ENCONTRADA' : 'NO ENCONTRADA', claseInfo);
      
      if (claseInfo) {
        const diaClase = (claseInfo as any).dia;
        console.log('[DELETE /api/reservas] 🔄 Reserva fija eliminada, procesando todas las fechas futuras para clase:', {
          clase_id: claseIdNum,
          dia: diaClase,
          hora: (claseInfo as any).hora
        });
        
        // Generar todas las fechas futuras para este día de la semana (próximos 30 días)
        const fechasFuturas: string[] = [];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        // Mapeo de días
        const diasMap: { [key: string]: number } = { 'Lun': 1, 'Mar': 2, 'Jue': 4, 'Sab': 6 };
        const targetDay = diasMap[diaClase];
        
        if (targetDay !== undefined) {
          for (let i = 0; i < 30; i++) {
            const fecha = new Date(hoy);
            fecha.setDate(hoy.getDate() + i);
            
            // Si el día de la semana coincide con el día de la clase
            if (fecha.getDay() === targetDay) {
              const fechaStr = fecha.toISOString().split('T')[0];
              fechasFuturas.push(fechaStr);
            }
          }
        }
        
        console.log('[DELETE /api/reservas] 📅 Fechas futuras generadas:', fechasFuturas.length, fechasFuturas);
        
        // Procesar cada fecha futura para promover de lista de espera
        for (const fechaFutura of fechasFuturas) {
          try {
            await promoverDeListaEspera(db, claseIdNum, fechaFutura);
          } catch (error: any) {
            console.error(`[DELETE /api/reservas] Error procesando fecha ${fechaFutura}:`, error.message);
            // Continuar con la siguiente fecha aunque haya error
          }
        }
      } else {
        console.warn('[DELETE /api/reservas] ⚠️ No se encontró información de la clase:', claseIdNum);
      }
      
      fechaClaseParaLista = null;
    }

    console.log('[DELETE /api/reservas] Reserva eliminada', { usuario_id, clase_id, fecha_clase });

    // Si se eliminó una reserva temporal o se canceló una fija (con fecha_clase), verificar si hay cupo disponible
    // y promover al siguiente en lista de espera
    if (fechaClaseParaLista) {
      try {
        await promoverDeListaEspera(db, claseIdNum, fechaClaseParaLista);
      } catch (promocionError: any) {
        console.error('[DELETE /api/reservas] Error al promover de lista de espera:', promocionError.message);
        // No lanzar el error, solo loguearlo para que la eliminación se complete
      }
    }

    // Código duplicado eliminado - ahora se usa la función promoverDeListaEspera()

    // Respuesta con información sobre si se promovió alguien
    // Respuesta con información sobre si se promovió alguien
    const respuesta: any = { success: true };
    
    if (fechaClaseParaLista) {
      // Intentar verificar si se promovió alguien
      try {
        const reservasFijasFinal = await db.prepare(`
          SELECT COUNT(DISTINCT usuario_id) as count
          FROM reserva
          WHERE clase_id = ? AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
            AND (es_reasignacion IS NULL OR es_reasignacion = 0)
        `).bind(claseIdNum).first();
        
        const reservasTemporalesFinal = await db.prepare(`
          SELECT COUNT(DISTINCT usuario_id) as count
          FROM reserva
          WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
        `).bind(claseIdNum, fechaClaseParaLista).first();
        
        const listaEsperaFinal = await db.prepare(`
          SELECT COUNT(*) as count
          FROM lista_espera
          WHERE clase_id = ? AND fecha_clase = ?
        `).bind(claseIdNum, fechaClaseParaLista).first().catch(() => ({ count: 0 }));
        
        respuesta.cupoFinal = {
          fijas: (reservasFijasFinal as any)?.count || 0,
          temporales: (reservasTemporalesFinal as any)?.count || 0,
          enListaEspera: ((listaEsperaFinal as any)?.count || 0),
          totalConfirmados: ((reservasFijasFinal as any)?.count || 0) + ((reservasTemporalesFinal as any)?.count || 0)
        };
      } catch (error) {
        console.error('[DELETE /api/reservas] Error obteniendo estado final:', error);
      }
    }

    console.log('[DELETE /api/reservas] Success', { usuario_id, clase_id, fecha_clase, respuesta });
    return NextResponse.json(respuesta);
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al eliminar reserva',
      { route: '/api/reservas', method: 'DELETE', operation: 'delete_reserva' }
    );
  }
}
