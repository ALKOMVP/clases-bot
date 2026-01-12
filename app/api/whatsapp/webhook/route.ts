import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, checkDatabaseAvailability, getEnvironmentInfo } from '@/lib/error-handler';

// OpenNext no requiere runtime = 'edge' explícito

// Configuración de WhatsApp (debe estar en variables de entorno)
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || '';
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || '';

// Reglas de cancelación:
// - Se puede cancelar mientras NO haya pasado la hora de la clase
// - Se puede cancelar hasta 2 horas antes del inicio
// Nota: interpretamos horarios como hora local Argentina (UTC-3), y comparamos contra Date.now() (UTC).
const ARG_UTC_OFFSET_HOURS = 3; // ART = UTC-3 => para convertir ART -> UTC sumamos 3 horas
const CANCELACION_ANTICIPACION_MINUTOS = 120;

function claseStartUtcMs(fechaISO: string, horaHHMM: string): number | null {
  try {
    const [y, m, d] = fechaISO.split('-').map((x) => parseInt(x, 10));
    const [hh, mm] = horaHHMM.split(':').map((x) => parseInt(x, 10));
    if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null;

    // Hora local Argentina -> UTC sumando 3 horas
    return Date.UTC(y, m - 1, d, hh + ARG_UTC_OFFSET_HOURS, mm, 0, 0);
  } catch {
    return null;
  }
}

function esCancelable(fechaISO: string, horaHHMM: string): boolean {
  const startUtc = claseStartUtcMs(fechaISO, horaHHMM);
  if (!startUtc) return false;
  const limiteUtc = startUtc - CANCELACION_ANTICIPACION_MINUTOS * 60 * 1000;
  return Date.now() < limiteUtc;
}

// --- Confirmación por template (para promociones al liberar cupo) ---
function getConfirmarReservaTemplateName(): string {
  const v = (process.env.WHATSAPP_CONFIRMAR_RESERVA_TEMPLATE || process.env.WHATSAPP_TEMPLATE_NAME || '').trim();
  if (!v || v === 'hello_world') return 'confirmar_reserva';
  return v;
}

function getTemplateLangCandidates(): string[] {
  const candidates = [
    (process.env.WHATSAPP_TEMPLATE_LANG || '').trim(),
    'es_AR',
    'es',
    'es_ES',
  ].filter(Boolean) as string[];
  const seen = new Set<string>();
  return candidates.filter((x) => !seen.has(x) && (seen.add(x), true));
}

function normalizarTelefonoWhatsAppSimple(telefonoRaw: string): string {
  const n = normalizarTelefono(telefonoRaw);
  if (!n) return '';
  let t = n;
  if (t.startsWith('0')) t = t.slice(1);
  if (t.startsWith('54') && !t.startsWith('549')) t = '549' + t.slice(2);
  if (!t.startsWith('54') && (t.length === 10 || t.length === 11)) t = '549' + t;
  return t;
}

async function enviarTemplateConfirmarReserva(to: string): Promise<boolean> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return false;
  const templateName = getConfirmarReservaTemplateName();
  const langs = getTemplateLangCandidates();
  for (const lang of langs) {
    try {
      const resp = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: lang },
          },
        }),
      });
      if (resp.ok) return true;
      const body = await resp.text();
      console.error('[enviarTemplateConfirmarReserva] Error', { status: resp.status, to, templateName, lang, body });
    } catch (e: any) {
      console.error('[enviarTemplateConfirmarReserva] Exception', e?.message || e);
    }
  }
  return false;
}

async function promoverDeListaEsperaSimple(db: any, claseId: number, fechaISO: string): Promise<void> {
  // Si la tabla no existe, salir
  let primero: any = null;
  try {
    primero = await db.prepare(`
      SELECT * FROM lista_espera
      WHERE clase_id = ? AND fecha_clase = ?
      ORDER BY numero ASC
      LIMIT 1
    `).bind(claseId, fechaISO).first();
  } catch {
    return;
  }
  if (!primero) return;

  // Chequear cupo actual
  const cupoMaximo = 35;
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
  `).bind(claseId, fechaISO).first();
  const countFijas = Number((reservasFijasQuery as any)?.count || 0);

  const reservasTemporalesQuery = await db.prepare(`
    SELECT COUNT(DISTINCT usuario_id) as count
    FROM reserva
    WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
  `).bind(claseId, fechaISO).first();
  const countTemporales = Number((reservasTemporalesQuery as any)?.count || 0);

  if ((countFijas + countTemporales) >= cupoMaximo) return;

  const usuarioId = Number(primero.usuario_id);

  // Evitar duplicado
  const existe = await db.prepare(`
    SELECT * FROM reserva
    WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
  `).bind(usuarioId, claseId, fechaISO).first();

  // Sacar de lista igual
  await db.prepare(`DELETE FROM lista_espera WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?`)
    .bind(usuarioId, claseId, fechaISO)
    .run();

  if (!existe) {
    await db.prepare(`
      INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
      VALUES (?, ?, ?, 1, datetime('now'))
    `).bind(usuarioId, claseId, fechaISO).run();
  }

  // Renumerar
  const restante = await db.prepare(`
    SELECT * FROM lista_espera
    WHERE clase_id = ? AND fecha_clase = ?
    ORDER BY numero ASC
  `).bind(claseId, fechaISO).all().catch(() => ({ results: [] }));
  const items = (restante.results || []) as any[];
  for (let i = 0; i < items.length; i++) {
    await db.prepare(`
      UPDATE lista_espera SET numero = ?
      WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
    `).bind(i + 1, items[i].usuario_id, claseId, fechaISO).run();
  }

  // Enviar template confirmar_reserva
  const u = await db.prepare(`SELECT telefono FROM usuario WHERE id = ?`).bind(usuarioId).first();
  const telefonoRaw = (u as any)?.telefono ? String((u as any).telefono) : '';
  const to = normalizarTelefonoWhatsAppSimple(telefonoRaw);
  if (to) await enviarTemplateConfirmarReserva(to);
}

// Helper para obtener la base de datos
function getDB(env?: { DB?: any }): any {
  // Intentar obtener de env.DB (Cloudflare)
  if (env?.DB) {
    return env.DB;
  }
  
  // Intentar process.env.DB (OpenNext)
  if (typeof process !== 'undefined' && (process.env as any).DB) {
    return (process.env as any).DB;
  }
  
  // En desarrollo, usar mock
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return getMockDBInstance();
  }
  
  // Intentar desde contexto de Cloudflare
  try {
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      return cloudflareContext.env.DB;
    }
  } catch (e) {
    // Ignorar errores
  }
  
  return null;
}

// Helper para normalizar teléfono (solo números)
function normalizarTelefono(telefono: string): string {
  // Remover todos los caracteres que no sean números
  return telefono.replace(/\D/g, '');
}

// Helper para obtener los últimos N dígitos de un teléfono
function obtenerUltimosDigitos(telefono: string, cantidad: number = 8): string {
  const normalizado = normalizarTelefono(telefono);
  if (normalizado.length < cantidad) {
    return normalizado; // Si tiene menos dígitos, devolver todos
  }
  return normalizado.slice(-cantidad);
}

// Helper para obtener usuario por teléfono (usando últimos 8 dígitos)
async function getUsuarioPorTelefono(db: any, telefono: string) {
  try {
    // Normalizar el teléfono recibido y obtener últimos 8 dígitos
    const ultimos8Digitos = obtenerUltimosDigitos(telefono, 8);
    console.log('[getUsuarioPorTelefono] Buscando usuario con últimos 8 dígitos:', ultimos8Digitos, 'del teléfono:', telefono);
    
    // Obtener todos los usuarios activos
    const usuarios = await db.prepare(
      'SELECT * FROM usuario WHERE activo = 1'
    ).all();
    
    const usuariosList = (usuarios?.results || []) as any[];
    
    // Buscar usuario que coincida con los últimos 8 dígitos
    for (const usuario of usuariosList) {
      if (usuario.telefono) {
        const ultimos8BD = obtenerUltimosDigitos(usuario.telefono, 8);
        if (ultimos8BD === ultimos8Digitos) {
          console.log('[getUsuarioPorTelefono] Usuario encontrado:', usuario.id, usuario.nombre, usuario.apellido);
          return usuario;
        }
      }
    }
    
    console.log('[getUsuarioPorTelefono] No se encontró usuario con últimos 8 dígitos:', ultimos8Digitos);
    return null;
  } catch (error) {
    console.error('[getUsuarioPorTelefono] Error:', error);
    return null;
  }
}

// Helper para obtener próximas clases de un usuario
async function getProximasClases(db: any, usuarioId: number) {
  try {
    // Obtener reservas fijas del usuario
    const reservas = await db.prepare(`
      SELECT r.*, c.dia, c.hora, c.nombre
      FROM reserva r
      JOIN clase c ON r.clase_id = c.id
      WHERE r.usuario_id = ? 
        AND (r.fecha_clase IS NULL OR r.fecha_clase = '' OR r.fecha_clase = 'null')
        AND (r.es_reasignacion IS NULL OR r.es_reasignacion = 0)
      ORDER BY c.dia, c.hora
    `).bind(usuarioId).all();
    
    const reservasList = (reservas?.results || []) as any[];
    
    // Calcular próximas ocurrencias de cada clase
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const proximasClases: Array<{ fecha: Date; clase: any; reserva: any }> = [];
    
    const diaMap: { [key: string]: number } = {
      'Lun': 1, // Lunes
      'Mar': 2, // Martes
      'Jue': 4, // Jueves
      'Sab': 6  // Sábado
    };
    
    const diaNombre: { [key: string]: string } = {
      'Lun': 'Lunes',
      'Mar': 'Martes',
      'Jue': 'Jueves',
      'Sab': 'Sábado'
    };
    
    for (const reserva of reservasList) {
      const diaSemana = diaMap[reserva.dia];
      if (!diaSemana) continue;
      
      // Calcular las próximas 3 ocurrencias de este día
      const fecha = new Date(hoy);
      const diaActual = fecha.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      
      let diasHastaProximo = diaSemana - diaActual;
      
      // Si es el mismo día (diasHastaProximo === 0), verificar si la clase ya pasó
      if (diasHastaProximo === 0) {
        const horaClase = String(reserva.hora || '');
        if (horaClase) {
          const fechaISO = fecha.toISOString().split('T')[0];
          const startUtc = claseStartUtcMs(fechaISO, horaClase);
          // Si la clase ya pasó (startUtc < Date.now()), usar el siguiente
          if (startUtc && startUtc < Date.now()) {
            diasHastaProximo = 7; // Siguiente semana
          }
          // Si no pasó, mantener diasHastaProximo = 0 para incluir hoy
        } else {
          // Si no hay hora, usar el siguiente
          diasHastaProximo = 7;
        }
      } else if (diasHastaProximo < 0) {
        diasHastaProximo += 7; // Siguiente semana
      }
      
      // Generar las próximas 3 ocurrencias
      for (let i = 0; i < 3; i++) {
        const fechaOcurrencia = new Date(fecha);
        fechaOcurrencia.setDate(fecha.getDate() + diasHastaProximo + (i * 7));
        
        // Verificar si hay cancelación para esta fecha
        const cancelacion = await db.prepare(`
          SELECT * FROM cancelacion
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
        `).bind(usuarioId, reserva.clase_id, fechaOcurrencia.toISOString().split('T')[0]).first();
        
        if (!cancelacion) {
          proximasClases.push({
            fecha: fechaOcurrencia,
            clase: reserva,
            reserva
          });
        }
      }
    }
    
    // Ordenar por fecha
    proximasClases.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    
    return proximasClases;
  } catch (error) {
    console.error('[getProximasClases] Error:', error);
    return [];
  }
}

// Próximas opciones cancelables: mezcla reservas fijas (próximas ocurrencias) + temporales (fecha_clase)
async function getProximasCancelables(db: any, usuarioId: number) {
  const items: Array<{ fecha: Date; clase: any; reserva: any; esTemporal: boolean }> = [];

  // Temporales del usuario (con fecha_clase)
  const temporales = await db.prepare(`
    SELECT r.*, c.dia, c.hora, c.nombre
    FROM reserva r
    JOIN clase c ON r.clase_id = c.id
    WHERE r.usuario_id = ?
      AND r.es_reasignacion = 1
      AND r.fecha_clase IS NOT NULL AND r.fecha_clase != '' AND r.fecha_clase != 'null'
      AND date(r.fecha_clase) >= date('now')
    ORDER BY r.fecha_clase ASC, c.hora ASC
  `).bind(usuarioId).all();

  for (const r of ((temporales?.results || []) as any[])) {
    const fechaISO = String(r.fecha_clase || '');
    const hora = String(r.hora || '');
    if (!fechaISO || !hora) continue;
    if (!esCancelable(fechaISO, hora)) continue;
    items.push({ fecha: new Date(fechaISO), clase: r, reserva: r, esTemporal: true });
  }

  // Fijas (usa la lógica existente para generar próximas ocurrencias)
  const fijas = await getProximasClases(db, usuarioId);
  for (const it of fijas) {
    const fechaISO = it.fecha.toISOString().split('T')[0];
    const hora = it.clase?.hora || '';
    if (!esCancelable(fechaISO, hora)) continue;
    items.push({ fecha: it.fecha, clase: it.clase, reserva: it.reserva, esTemporal: false });
  }

  // Ordenar por fecha/hora y tomar top 3
  items.sort((a, b) => {
    const d = a.fecha.getTime() - b.fecha.getTime();
    if (d !== 0) return d;
    return String(a.clase?.hora || '').localeCompare(String(b.clase?.hora || ''));
  });

  // De-duplicar por (clase_id, fecha)
  const seen = new Set<string>();
  const out: typeof items = [];
  for (const it of items) {
    const claseId = Number(it.reserva?.clase_id ?? it.clase?.clase_id ?? it.clase?.id);
    const fechaISO = it.fecha.toISOString().split('T')[0];
    const key = `${claseId}_${fechaISO}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
    if (out.length >= 3) break;
  }
  return out;
}

// Helper para formatear fecha en español
function formatearFecha(fecha: Date): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const dia = dias[fecha.getDay()];
  const diaNum = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  const año = fecha.getFullYear();
  
  return `${dia} ${diaNum} de ${mes} de ${año}`;
}

// Helper para formatear fecha para botones: "Lun 19:00 12 ene"
function formatearFechaBoton(fecha: Date, hora: string): string {
  const diasCortos = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'];
  const mesesCortos = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 
                       'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  
  const dia = diasCortos[fecha.getDay()];
  const diaNum = fecha.getDate();
  const mes = mesesCortos[fecha.getMonth()];
  
  return `${dia} ${hora} ${diaNum} ${mes}`;
}

// Helper para formatear fecha corta: "Lunes 19:00 - 12 de enero"
function formatearFechaCorta(fecha: Date, hora: string): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const dia = dias[fecha.getDay()];
  const diaNum = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  
  return `${dia} ${hora} - ${diaNum} de ${mes}`;
}

// Helper para enviar mensaje de texto a WhatsApp
async function enviarMensajeTexto(phoneNumberId: string, token: string, to: string, text: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: text }
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[enviarMensajeTexto] Error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[enviarMensajeTexto] Error:', error);
    return false;
  }
}

// Helper para enviar mensaje con botones a WhatsApp
async function enviarMensajeConBotones(
  phoneNumberId: string, 
  token: string, 
  to: string, 
  texto: string, 
  botones: Array<{ id: string; title: string }>
) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: texto },
            action: {
              buttons: botones.map(btn => ({
                type: 'reply',
                reply: {
                  id: btn.id,
                  title: btn.title
                }
              }))
            }
          }
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[enviarMensajeConBotones] Error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[enviarMensajeConBotones] Error:', error);
    return false;
  }
}

// Helper para enviar mensaje con lista (modal con "Ver clases")
async function enviarMensajeConLista(
  phoneNumberId: string,
  token: string,
  to: string,
  texto: string,
  botonTexto: string,
  secciones: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>
) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: texto },
            action: {
              button: botonTexto,
              sections: secciones
            }
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[enviarMensajeConLista] Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[enviarMensajeConLista] Error:', error);
    return false;
  }
}

// Helper: contar clases a recuperar disponibles
async function getClasesRecuperarDisponibles(db: any, usuarioId: number): Promise<number> {
  try {
    const row = await db.prepare(`
      SELECT COUNT(*) as total
      FROM clase_recuperar
      WHERE usuario_id = ? AND usado = 0 AND fecha_vencimiento >= date('now')
    `).bind(usuarioId).first();
    return Number((row as any)?.total || 0);
  } catch (e: any) {
    // Si la tabla no existe aún, considerar 0
    if (e?.message?.includes('no such table')) return 0;
    console.error('[getClasesRecuperarDisponibles] Error:', e);
    return 0;
  }
}

// Helper: obtener próximas clases (todas las clases del calendario) para reservar en los próximos N días
function generarOcurrenciasDeClases(clases: any[], diasHaciaAdelante: number): Array<{ fecha: Date; clase: any }> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(hoy);
  fin.setDate(fin.getDate() + diasHaciaAdelante);

  const diaMap: { [key: string]: number } = { 'Lun': 1, 'Mar': 2, 'Jue': 4, 'Sab': 6 };

  const ocurrencias: Array<{ fecha: Date; clase: any }> = [];

  for (const clase of clases) {
    const diaSemana = diaMap[clase.dia];
    if (!diaSemana) continue;

    const diaActual = hoy.getDay();
    let diasHasta = diaSemana - diaActual;
    if (diasHasta < 0) diasHasta += 7;

    // incluir hoy si coincide (diasHasta = 0)
    const primera = new Date(hoy);
    primera.setDate(primera.getDate() + diasHasta);

    for (let f = new Date(primera); f <= fin; f.setDate(f.getDate() + 7)) {
      ocurrencias.push({ fecha: new Date(f), clase });
    }
  }

  // Ordenar por fecha y hora
  ocurrencias.sort((a, b) => {
    const diff = a.fecha.getTime() - b.fecha.getTime();
    if (diff !== 0) return diff;
    return String(a.clase.hora || '').localeCompare(String(b.clase.hora || ''));
  });

  return ocurrencias;
}

function formatearFilaClase(fecha: Date, hora: string): string {
  const diasCortos = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const mesesCortos = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dia = diasCortos[fecha.getDay()];
  const diaNum = fecha.getDate();
  const mes = mesesCortos[fecha.getMonth()];
  // Ej: "Sáb 09:30 10 ene"
  return `${dia} ${hora} ${diaNum} ${mes}`;
}

// Helper: determinar si una clase/fecha tiene cupo completo (considerando cancelaciones de fijos)
async function isCupoCompleto(db: any, claseId: number, fechaISO: string): Promise<boolean> {
  const cupoMaximo = 35;

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
  `).bind(claseId, fechaISO).first();

  const countFijas = Number((reservasFijasQuery as any)?.count || 0);

  const reservasTemporalesQuery = await db.prepare(`
    SELECT COUNT(DISTINCT usuario_id) as count
    FROM reserva
    WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
  `).bind(claseId, fechaISO).first();

  const countTemporales = Number((reservasTemporalesQuery as any)?.count || 0);

  return (countFijas + countTemporales) >= cupoMaximo;
}

// Handler para "Ver mis clases"
async function handleVerClases(db: any, usuarioId: number, from: string) {
  const proximasClases = await getProximasClases(db, usuarioId);
  
  if (proximasClases.length === 0) {
    await enviarMensajeTexto(
      PHONE_NUMBER_ID,
      WHATSAPP_TOKEN,
      from,
      '📅 No tienes clases programadas en este momento.'
    );
    return;
  }
  
  // Formato como en la captura: lista numerada "Lunes 17:30 - 12 de enero"
  let mensaje = '📅 *Tus próximas clases:*\n\n';

  const top = proximasClases.slice(0, 3); // Mostrar 3 clases
  for (let i = 0; i < top.length; i++) {
    const item = top[i];
    const hora = item.clase?.hora || '';
    const linea = formatearFechaCorta(item.fecha, hora); // "Lunes 17:30 - 12 de enero"
    mensaje += `${i + 1}. ${linea}\n`;
  }
  
  await enviarMensajeTexto(PHONE_NUMBER_ID, WHATSAPP_TOKEN, from, mensaje);
}

// Handler para "Reservar clase" (antes "Agendar") -> lista con botón "Ver clases" + modal
async function handleReservarClase(db: any, usuarioId: number, from: string, offset: number = 0) {
  // Obtener todas las clases del calendario (clases semanales)
  const clases = await db.prepare('SELECT * FROM clase ORDER BY dia, hora').all();
  const clasesList = (clases?.results || []) as any[];

  if (clasesList.length === 0) {
    await enviarMensajeTexto(PHONE_NUMBER_ID, WHATSAPP_TOKEN, from, '❌ No hay clases disponibles en este momento.');
    return;
  }

  const disponibles = await getClasesRecuperarDisponibles(db, usuarioId);
  const ocurrencias = generarOcurrenciasDeClases(clasesList, 30);

  // Paginación: WhatsApp list -> máx 10 filas. Usamos 9 + 1 "Ver más clases".
  const pageSize = 9;
  const slice = ocurrencias.slice(offset, offset + pageSize);

  const rows: Array<{ id: string; title: string; description?: string }> = [];
  for (const o of slice) {
    const fechaISO = o.fecha.toISOString().split('T')[0];
    const claseId = Number(o.clase.id);
    const cupoCompleto = await isCupoCompleto(db, claseId, fechaISO);
    const title = `${cupoCompleto ? '🟡 ' : ''}${formatearFilaClase(o.fecha, o.clase.hora)}`;
    rows.push({
      id: `reservar_${claseId}_${fechaISO}`,
      title,
      description: cupoCompleto ? 'Cupo completo: lista de espera' : (o.clase.nombre || 'Yoga'),
    });
  }

  if (ocurrencias.length > offset + pageSize) {
    rows.push({
      id: `ver_mas_clases_${offset + pageSize}`,
      title: '➡️ Ver más clases',
      description: 'Mostrar más opciones'
    });
  }

  const texto =
    `📚 *Clases disponibles*\n\n` +
    `Tienes ${disponibles} clase${disponibles === 1 ? '' : 's'} a recuperar.\n\n` +
    `🟡 = cupo completo (si elegís esa opción, quedás en lista de espera)\n\n` +
    `Selecciona una clase:`;

  await enviarMensajeConLista(
    PHONE_NUMBER_ID,
    WHATSAPP_TOKEN,
    from,
    texto,
    'Ver clases',
    [
      {
        title: 'Clases',
        rows
      }
    ]
  );
}

// Handler para "Cancelar"
async function handleCancelar(db: any, usuarioId: number, from: string) {
  const cancelables = await getProximasCancelables(db, usuarioId);
  
  if (cancelables.length === 0) {
    await enviarMensajeTexto(
      PHONE_NUMBER_ID,
      WHATSAPP_TOKEN,
      from,
      '📅 No tienes clases cancelables en este momento.\n\n⚠️ Recordá: podés cancelar hasta 2 horas antes del inicio de la clase.'
    );
    return;
  }
  
  // Mostrar las próximas 3 clases para cancelar
  const clasesParaCancelar = cancelables.slice(0, 3);
  
  let mensaje = '❌ Selecciona la clase que quieres cancelar:\n\n';
  
  const botones: Array<{ id: string; title: string }> = [];
  for (let i = 0; i < clasesParaCancelar.length; i++) {
    const item = clasesParaCancelar[i];
    const fechaStr = formatearFechaCorta(item.fecha, item.clase.hora);
    const textoBoton = formatearFechaBoton(item.fecha, item.clase.hora);
    
    mensaje += `${i + 1}. ${fechaStr}\n`;
    botones.push({
      // IMPORTANTE: `item.clase` proviene de `SELECT r.* ...`, por lo que `id` es el id de la RESERVA.
      // Para cancelar necesitamos el id de la CLASE (clase_id).
      id: `cancelar_${item.reserva?.clase_id ?? item.clase?.clase_id ?? item.clase?.id}_${item.fecha.toISOString().split('T')[0]}`,
      title: textoBoton.length > 20 ? textoBoton.substring(0, 20) : textoBoton
    });
  }
  
  if (botones.length > 0) {
    await enviarMensajeConBotones(
      PHONE_NUMBER_ID,
      WHATSAPP_TOKEN,
      from,
      mensaje,
      botones
    );
  } else {
    await enviarMensajeTexto(PHONE_NUMBER_ID, WHATSAPP_TOKEN, from, mensaje);
  }
}

// Handler para procesar cancelación específica
async function procesarCancelacion(db: any, usuarioId: number, claseId: number, fechaClase: string) {
  try {
    console.log('[procesarCancelacion] Buscando reserva:', { usuarioId, claseId, fechaClase });
    
    // Verificar que la reserva fija existe (las reservas fijas no tienen fecha_clase)
    const reserva = await db.prepare(`
      SELECT * FROM reserva
      WHERE usuario_id = ? AND clase_id = ? 
        AND (fecha_clase IS NULL OR fecha_clase = '' OR fecha_clase = 'null')
        AND (es_reasignacion IS NULL OR es_reasignacion = 0)
    `).bind(usuarioId, claseId).first();
    
    console.log('[procesarCancelacion] Reserva encontrada:', reserva);
    
    // Buscar temporal específico (solo temporales reales)
    const reservaTemporal = await db.prepare(`
      SELECT * FROM reserva
      WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
    `).bind(usuarioId, claseId, fechaClase).first();

    if (!reserva && !reservaTemporal) {
      console.log('[procesarCancelacion] No se encontró reserva fija ni temporal');
      return { success: false, message: 'No se encontró la reserva' };
    }
    
    const esTemporal = !!reservaTemporal;

    // Para fijas: evitar duplicado
    if (!esTemporal) {
      const cancelacionExistente = await db.prepare(`
        SELECT * FROM cancelacion
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
      `).bind(usuarioId, claseId, fechaClase).first();
      if (cancelacionExistente) {
        return { success: false, message: 'Ya existe una cancelación para esta clase' };
      }
    }
    
    // Obtener información de la clase
    const clase = await db.prepare('SELECT * FROM clase WHERE id = ?').bind(claseId).first();
    if (!clase) {
      return { success: false, message: 'No se encontró la clase' };
    }

    // Validar ventana de cancelación: hasta 1 hora antes del inicio
    const horaClase = (clase as any)?.hora ? String((clase as any).hora) : '';
    if (!esCancelable(fechaClase, horaClase)) {
      return { success: false, message: 'Solo podés cancelar hasta 2 horas antes del inicio de la clase.' };
    }
    
    if (esTemporal) {
      // Cancelación de temporal: borrar la reserva temporal para liberar cupo
      await db.prepare(`
        DELETE FROM reserva
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
      `).bind(usuarioId, claseId, fechaClase).run();

      // Cupo liberado -> promover lista de espera si corresponde (con template al promovido)
      await promoverDeListaEsperaSimple(db, claseId, fechaClase);
    } else {
      // Cancelación de fija: crear registro de cancelación para esa fecha
      await db.prepare(`
        INSERT INTO cancelacion (usuario_id, clase_id, fecha_clase, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).bind(usuarioId, claseId, fechaClase).run();
    }
    
    // Crear clase a recuperar (vencimiento en 30 días)
    const fechaCreacion = new Date().toISOString().split('T')[0];
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
    const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];
    
    // Verificar si la tabla existe, si no, crearla
    try {
      await db.prepare(`
        INSERT INTO clase_recuperar (usuario_id, fecha_creacion, fecha_vencimiento, clase_id, fecha_clase_cancelada, usado)
        VALUES (?, ?, ?, ?, ?, 0)
      `).bind(usuarioId, fechaCreacion, fechaVencimientoStr, claseId, fechaClase).run();
    } catch (error: any) {
      // Si la tabla no existe, intentar crearla
      if (error.message?.includes('no such table')) {
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS clase_recuperar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            fecha_creacion TEXT NOT NULL,
            fecha_vencimiento TEXT NOT NULL,
            clase_id INTEGER,
            fecha_clase_cancelada TEXT,
            usado INTEGER DEFAULT 0,
            fecha_uso TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (usuario_id) REFERENCES usuario(id),
            FOREIGN KEY (clase_id) REFERENCES clase(id)
          )
        `).run();
        
        // Intentar insertar de nuevo
        await db.prepare(`
          INSERT INTO clase_recuperar (usuario_id, fecha_creacion, fecha_vencimiento, clase_id, fecha_clase_cancelada, usado)
          VALUES (?, ?, ?, ?, ?, 0)
        `).bind(usuarioId, fechaCreacion, fechaVencimientoStr, claseId, fechaClase).run();
      } else {
        throw error;
      }
    }
    
    // Contar clases a recuperar activas del usuario
    const clasesRecuperar = await db.prepare(`
      SELECT COUNT(*) as total FROM clase_recuperar
      WHERE usuario_id = ? AND usado = 0 AND fecha_vencimiento >= date('now')
    `).bind(usuarioId).first();
    
    const totalClasesRecuperar = clasesRecuperar?.total || 0;
    
    // Formatear fecha de la clase cancelada para el mensaje
    const fechaCancelada = new Date(fechaClase);
    const fechaFormateada = formatearFechaCorta(fechaCancelada, clase.hora);
    
    // Promover de lista de espera si hay cupo
    // (Esta lógica ya está en app/api/reservas/route.ts)
    
    return { 
      success: true, 
      message: 'Cancelación registrada exitosamente',
      fechaFormateada,
      totalClasesRecuperar
    };
  } catch (error: any) {
    console.error('[procesarCancelacion] Error:', error);
    return { success: false, message: error.message || 'Error al procesar cancelación' };
  }
}

// GET: Verificación de webhook (para configuración inicial)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[GET /api/whatsapp/webhook] Webhook verificado');
    return new NextResponse(challenge, { status: 200 });
  }
  
  return new NextResponse('Forbidden', { status: 403 });
}

// POST: Recibir mensajes de WhatsApp
export async function POST(request: NextRequest) {
  try {
    // Obtener DB desde el contexto de Cloudflare o process.env
    let db: any = null;
    
    // Intentar desde contexto de Cloudflare
    try {
      const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
      if (cloudflareContext?.env?.DB) {
        db = cloudflareContext.env.DB;
      }
    } catch (e) {
      // Ignorar errores
    }
    
    // Si no hay DB del contexto, usar getDB
    if (!db) {
      db = getDB();
    }
    
    if (!db) {
      console.error('[POST /api/whatsapp/webhook] DB not available');
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    
    const body = await request.json();
    console.log('[POST /api/whatsapp/webhook] Received:', JSON.stringify(body, null, 2));
    
    // WhatsApp envía los mensajes en body.entry[0].changes[0].value
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    if (!value) {
      return NextResponse.json({ received: true });
    }
    
    // Procesar mensajes
    const messages = value.messages || [];
    
    for (const message of messages) {
      const from = message.from; // Número de teléfono (sin +)
      const messageType = message.type;
      const messageId = message.id;
      
      console.log('[POST /api/whatsapp/webhook] Processing message:', { from, messageType, messageId });
      
      // Obtener usuario por teléfono
      const usuario = await getUsuarioPorTelefono(db, from);
      
      if (!usuario) {
        await enviarMensajeTexto(
          PHONE_NUMBER_ID,
          WHATSAPP_TOKEN,
          from,
          '❌ No estás registrado en el sistema. Por favor, contacta a la administración.'
        );
        continue;
      }
      
      // Procesar según el tipo de mensaje
      if (messageType === 'text') {
        const text = message.text?.body?.toLowerCase().trim() || '';
        
        // Detectar comandos
        if (text.includes('ver') && (text.includes('clase') || text.includes('clases'))) {
          await handleVerClases(db, usuario.id, from);
        } else if (text.includes('agendar') || text.includes('inscribir') || text.includes('reservar')) {
          await handleReservarClase(db, usuario.id, from);
        } else if (text.includes('cancelar') || text.includes('cancel')) {
          await handleCancelar(db, usuario.id, from);
        } else {
          // Menú principal
          await enviarMensajeConBotones(
            PHONE_NUMBER_ID,
            WHATSAPP_TOKEN,
            from,
            `¡Hola ${usuario.nombre}! 👋\n\n¿En qué te puedo ayudar?`,
            [
              { id: 'cancelar', title: '❌ Cancelar clase' },
              { id: 'reservar', title: '✅ Reservar clase' },
              { id: 'ver_clases', title: '📅 Ver mis clases' }
            ]
          );
        }
      } else if (messageType === 'interactive') {
        // Procesar respuestas de botones
        const interactive = message.interactive;
        const buttonId = interactive?.button_reply?.id || interactive?.list_reply?.id;
        
        if (buttonId === 'ver_clases') {
          await handleVerClases(db, usuario.id, from);
        } else if (buttonId === 'cancelar') {
          await handleCancelar(db, usuario.id, from);
        } else if (buttonId === 'reservar') {
          await handleReservarClase(db, usuario.id, from);
        } else if (buttonId?.startsWith('ver_mas_clases_')) {
          const nextOffset = parseInt(buttonId.split('_').pop() || '0', 10) || 0;
          await handleReservarClase(db, usuario.id, from, nextOffset);
        } else if (buttonId?.startsWith('reservar_')) {
          // Reservar una clase específica usando una clase a recuperar
          const partes = buttonId.split('_');
          if (partes.length === 3) {
            const claseId = parseInt(partes[1], 10);
            const fechaClase = partes[2];

            // Validar que tenga clases a recuperar
            const disponibles = await getClasesRecuperarDisponibles(db, usuario.id);
            if (disponibles <= 0) {
              await enviarMensajeTexto(
                PHONE_NUMBER_ID,
                WHATSAPP_TOKEN,
                from,
                '❌ No tienes clases a recuperar disponibles.'
              );
              continue;
            }

            // Reutilizar la lógica del endpoint temporal (simplificada)
            try {
              // Evitar duplicados (fijo o temporal en esa fecha)
              const existente = await db.prepare(`
                SELECT * FROM reserva
                WHERE usuario_id = ? AND clase_id = ?
                  AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '' OR fecha_clase = ?)
              `).bind(usuario.id, claseId, fechaClase).first();

              if (existente) {
                await enviarMensajeTexto(
                  PHONE_NUMBER_ID,
                  WHATSAPP_TOKEN,
                  from,
                  '⚠️ Ya estás inscripto en esa clase.'
                );
                continue;
              }

              // Cupo: fijos + temporales confirmados
              const fijas = await db.prepare(`
                SELECT COUNT(DISTINCT usuario_id) as count
                FROM reserva
                WHERE clase_id = ?
                  AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
                  AND (es_reasignacion IS NULL OR es_reasignacion = 0)
              `).bind(claseId).first();

              const temporales = await db.prepare(`
                SELECT COUNT(DISTINCT usuario_id) as count
                FROM reserva
                WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
              `).bind(claseId, fechaClase).first();

              const cupoMaximo = 35;
              const totalConfirmados = Number((fijas as any)?.count || 0) + Number((temporales as any)?.count || 0);

              if (totalConfirmados >= cupoMaximo) {
                // Lista de espera (si existe tabla)
                try {
                  const maxNumero = await db.prepare(`
                    SELECT COALESCE(MAX(numero), 0) as max_num
                    FROM lista_espera
                    WHERE clase_id = ? AND fecha_clase = ?
                  `).bind(claseId, fechaClase).first();
                  const siguienteNumero = (Number((maxNumero as any)?.max_num || 0) + 1);

                  await db.prepare(`
                    INSERT INTO lista_espera (usuario_id, clase_id, fecha_clase, numero, created_at)
                    VALUES (?, ?, ?, ?, datetime('now'))
                  `).bind(usuario.id, claseId, fechaClase, siguienteNumero).run();

                  await enviarMensajeTexto(
                    PHONE_NUMBER_ID,
                    WHATSAPP_TOKEN,
                    from,
                    `⏳ Cupo completo. Te agregué a la lista de espera (posición ${siguienteNumero}).\n\n📩 Te voy a avisar por WhatsApp cuando se confirme un cupo.`
                  );
                } catch {
                  await enviarMensajeTexto(
                    PHONE_NUMBER_ID,
                    WHATSAPP_TOKEN,
                    from,
                    '⏳ Cupo completo. Contactá a la administración para lista de espera.\n\n📩 Cuando se libere un cupo, te avisaremos por WhatsApp.'
                  );
                }
                continue;
              }

              // Crear reserva temporal
              await db.prepare(`
                INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
                VALUES (?, ?, ?, 1, datetime('now'))
              `).bind(usuario.id, claseId, fechaClase).run();

              // Consumir 1 clase a recuperar (la que vence primero)
              const recuperar = await db.prepare(`
                SELECT id FROM clase_recuperar
                WHERE usuario_id = ? AND usado = 0 AND fecha_vencimiento >= date('now')
                ORDER BY fecha_vencimiento ASC, id ASC
                LIMIT 1
              `).bind(usuario.id).first();

              if (recuperar?.id) {
                await db.prepare(`
                  UPDATE clase_recuperar
                  SET usado = 1, fecha_uso = date('now')
                  WHERE id = ?
                `).bind(recuperar.id).run();
              }

              await enviarMensajeTexto(
                PHONE_NUMBER_ID,
                WHATSAPP_TOKEN,
                from,
                '✅ Reserva realizada exitosamente. Respondé cualquier mensaje para volver al menú.'
              );
            } catch (e: any) {
              console.error('[reservar_clase] Error:', e);
              await enviarMensajeTexto(
                PHONE_NUMBER_ID,
                WHATSAPP_TOKEN,
                from,
                `❌ Error al reservar: ${e?.message || 'Error desconocido'}`
              );
            }
          }
        } else if (buttonId?.startsWith('cancelar_')) {
          // Procesar cancelación específica
          const partes = buttonId.split('_');
          if (partes.length === 3) {
            const claseId = parseInt(partes[1]);
            const fechaClase = partes[2];
            const resultado = await procesarCancelacion(db, usuario.id, claseId, fechaClase);
            
            if (resultado.success) {
              // Mensaje de confirmación según la imagen
              let mensajeConfirmacion = '✅ Clase cancelada exitosamente\n';
              mensajeConfirmacion += `Clase cancelada: ${resultado.fechaFormateada}\n`;
              mensajeConfirmacion += `Se te ha asignado ${resultado.totalClasesRecuperar} clase${resultado.totalClasesRecuperar > 1 ? 's' : ''} a recuperar que puedes usar en los próximos 30 días.\n`;
              mensajeConfirmacion += 'Responde cualquier mensaje para volver al menú.';
              
              await enviarMensajeTexto(
                PHONE_NUMBER_ID,
                WHATSAPP_TOKEN,
                from,
                mensajeConfirmacion
              );
            } else {
              await enviarMensajeTexto(
                PHONE_NUMBER_ID,
                WHATSAPP_TOKEN,
                from,
                `❌ ${resultado.message}`
              );
            }
          }
        }
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[POST /api/whatsapp/webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

