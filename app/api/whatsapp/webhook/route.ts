import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, checkDatabaseAvailability, getEnvironmentInfo } from '@/lib/error-handler';

// OpenNext no requiere runtime = 'edge' explícito

// Configuración de WhatsApp (debe estar en variables de entorno)
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || '';
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || '';

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

// Helper para obtener usuario por teléfono
async function getUsuarioPorTelefono(db: any, telefono: string) {
  try {
    const result = await db.prepare(
      'SELECT * FROM usuario WHERE telefono = ? AND activo = 1'
    ).bind(telefono).first();
    return result as any;
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
      
      // Calcular próxima ocurrencia de este día
      const fecha = new Date(hoy);
      const diaActual = fecha.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      
      let diasHastaProximo = diaSemana - diaActual;
      if (diasHastaProximo <= 0) {
        diasHastaProximo += 7; // Siguiente semana
      }
      
      fecha.setDate(fecha.getDate() + diasHastaProximo);
      
      // Verificar si hay cancelación para esta fecha
      const cancelacion = await db.prepare(`
        SELECT * FROM cancelacion
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
      `).bind(usuarioId, reserva.clase_id, fecha.toISOString().split('T')[0]).first();
      
      if (!cancelacion) {
        proximasClases.push({
          fecha,
          clase: reserva,
          reserva
        });
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
  
  let mensaje = '📅 *Tus próximas clases:*\n\n';
  
  for (const item of proximasClases.slice(0, 5)) { // Máximo 5 clases
    const fechaStr = formatearFecha(item.fecha);
    const hora = item.clase.hora;
    const nombre = item.clase.nombre || 'Yoga';
    
    mensaje += `• ${fechaStr} a las ${hora}\n`;
    mensaje += `  ${nombre}\n\n`;
  }
  
  if (proximasClases.length > 5) {
    mensaje += `\n_Y tienes ${proximasClases.length - 5} clase(s) más..._`;
  }
  
  await enviarMensajeTexto(PHONE_NUMBER_ID, WHATSAPP_TOKEN, from, mensaje);
}

// Handler para "Agendar"
async function handleAgendar(db: any, usuarioId: number, from: string) {
  // Obtener todas las clases disponibles
  const clases = await db.prepare('SELECT * FROM clase ORDER BY dia, hora').all();
  const clasesList = (clases?.results || []) as any[];
  
  if (clasesList.length === 0) {
    await enviarMensajeTexto(
      PHONE_NUMBER_ID,
      WHATSAPP_TOKEN,
      from,
      '❌ No hay clases disponibles en este momento.'
    );
    return;
  }
  
  // Agrupar por día
  const clasesPorDia: { [key: string]: any[] } = {};
  const diaNombre: { [key: string]: string } = {
    'Lun': 'Lunes',
    'Mar': 'Martes',
    'Jue': 'Jueves',
    'Sab': 'Sábado'
  };
  
  for (const clase of clasesList) {
    if (!clasesPorDia[clase.dia]) {
      clasesPorDia[clase.dia] = [];
    }
    clasesPorDia[clase.dia].push(clase);
  }
  
  let mensaje = '📚 *Clases disponibles:*\n\n';
  
  const ordenDias = ['Lun', 'Mar', 'Jue', 'Sab'];
  for (const dia of ordenDias) {
    if (clasesPorDia[dia]) {
      mensaje += `*${diaNombre[dia]}:*\n`;
      for (const clase of clasesPorDia[dia]) {
        mensaje += `• ${clase.hora} - ${clase.nombre || 'Yoga'}\n`;
      }
      mensaje += '\n';
    }
  }
  
  mensaje += '\n_Para agendar, responde con el número de la clase o contacta a la administración._';
  
  await enviarMensajeTexto(PHONE_NUMBER_ID, WHATSAPP_TOKEN, from, mensaje);
}

// Handler para "Cancelar"
async function handleCancelar(db: any, usuarioId: number, from: string) {
  const proximasClases = await getProximasClases(db, usuarioId);
  
  if (proximasClases.length === 0) {
    await enviarMensajeTexto(
      PHONE_NUMBER_ID,
      WHATSAPP_TOKEN,
      from,
      '📅 No tienes clases programadas para cancelar.'
    );
    return;
  }
  
  // Mostrar las próximas 3 clases para cancelar
  const clasesParaCancelar = proximasClases.slice(0, 3);
  
  let mensaje = '❌ Selecciona la clase que quieres cancelar:\n\n';
  
  const botones: Array<{ id: string; title: string }> = [];
  for (let i = 0; i < clasesParaCancelar.length; i++) {
    const item = clasesParaCancelar[i];
    const fechaStr = formatearFechaCorta(item.fecha, item.clase.hora);
    const textoBoton = formatearFechaBoton(item.fecha, item.clase.hora);
    
    mensaje += `${i + 1}. ${fechaStr}\n`;
    botones.push({
      id: `cancelar_${item.clase.id}_${item.fecha.toISOString().split('T')[0]}`,
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
    // Verificar que la reserva existe
    const reserva = await db.prepare(`
      SELECT * FROM reserva
      WHERE usuario_id = ? AND clase_id = ? 
        AND (fecha_clase IS NULL OR fecha_clase = '' OR fecha_clase = 'null')
    `).bind(usuarioId, claseId).first();
    
    if (!reserva) {
      return { success: false, message: 'No se encontró la reserva' };
    }
    
    // Obtener información de la clase
    const clase = await db.prepare('SELECT * FROM clase WHERE id = ?').bind(claseId).first();
    if (!clase) {
      return { success: false, message: 'No se encontró la clase' };
    }
    
    // Crear cancelación
    await db.prepare(`
      INSERT INTO cancelacion (usuario_id, clase_id, fecha_clase, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(usuarioId, claseId, fechaClase).run();
    
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
        } else if (text.includes('agendar') || text.includes('inscribir')) {
          await handleAgendar(db, usuario.id, from);
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
              { id: 'ver_clases', title: '📅 Ver mis clases' },
              { id: 'agendar', title: '📚 Agendar' },
              { id: 'cancelar', title: '❌ Cancelar' }
            ]
          );
        }
      } else if (messageType === 'interactive') {
        // Procesar respuestas de botones
        const interactive = message.interactive;
        const buttonId = interactive?.button_reply?.id || interactive?.list_reply?.id;
        
        if (buttonId === 'ver_clases') {
          await handleVerClases(db, usuario.id, from);
        } else if (buttonId === 'agendar') {
          await handleAgendar(db, usuario.id, from);
        } else if (buttonId === 'cancelar') {
          await handleCancelar(db, usuario.id, from);
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

