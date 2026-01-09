#!/usr/bin/env node

/**
 * Script para probar la respuesta exacta de producción
 * Replica el comportamiento del bot en producción:
 * - Busca usuario por últimos 8 dígitos del teléfono
 * - Muestra saludo personalizado con nombre
 * - Muestra las próximas 3 clases del usuario
 * Uso: node scripts/test-whatsapp-prod-response.js [numero]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cargar variables de .dev.vars
function loadDevVars() {
  const devVarsPath = path.join(__dirname, '..', '.dev.vars');
  
  if (!fs.existsSync(devVarsPath)) {
    console.error('❌ Error: No se encontró el archivo .dev.vars');
    process.exit(1);
  }
  
  const content = fs.readFileSync(devVarsPath, 'utf-8');
  const vars = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      vars[key] = value;
    }
  });
  
  return vars;
}

// Helper para obtener usuario por últimos 8 dígitos del teléfono usando wrangler d1
async function getUsuarioPorUltimos8Digitos(telefono) {
  // Obtener últimos 8 dígitos
  const ultimos8 = telefono.slice(-8);
  
  try {
    // Usar wrangler d1 execute para consultar la base de datos
    const query = `SELECT * FROM usuario WHERE telefono LIKE '%${ultimos8}' AND activo = 1 LIMIT 1`;
    const result = execSync(
      `wrangler d1 execute clases-db --command "${query.replace(/"/g, '\\"')}" --json`,
      { encoding: 'utf-8', cwd: path.join(__dirname, '..') }
    );
    
    const parsed = JSON.parse(result);
    if (parsed && parsed[0] && parsed[0].results && parsed[0].results.length > 0) {
      return parsed[0].results[0];
    }
    return null;
  } catch (error) {
    console.error('[getUsuarioPorUltimos8Digitos] Error:', error.message);
    return null;
  }
}

// Helper para obtener próximas clases de un usuario usando la API
async function getProximasClases(usuarioId, limite = 3) {
  try {
    // Obtener todas las reservas desde la API
    const reservasResponse = await fetch('http://localhost:8788/api/reservas');
    if (!reservasResponse.ok) {
      console.warn('[getProximasClases] Error al obtener reservas desde API:', reservasResponse.status);
      return [];
    }
    
    const reservasData = await reservasResponse.json();
    const todasLasReservas = Array.isArray(reservasData) ? reservasData : [];
    
    // Filtrar reservas fijas del usuario (sin fecha_clase)
    const reservasList = todasLasReservas.filter(r => 
      r.usuario_id === usuarioId && 
      (!r.fecha_clase || r.fecha_clase === null || r.fecha_clase === '' || r.fecha_clase === 'null') &&
      (!r.es_reasignacion || r.es_reasignacion === 0)
    );
    
    // Obtener clases desde la API
    const clasesResponse = await fetch('http://localhost:8788/api/clases');
    if (!clasesResponse.ok) {
      console.warn('[getProximasClases] Error al obtener clases desde API:', clasesResponse.status);
      return [];
    }
    
    const clasesData = await clasesResponse.json();
    const todasLasClases = Array.isArray(clasesData) ? clasesData : [];
    
    // Enriquecer reservas con información de clases
    const reservasConClase = reservasList.map(r => {
      const clase = todasLasClases.find(c => c.id === r.clase_id);
      return {
        ...r,
        dia: clase?.dia,
        hora: clase?.hora,
        nombre: clase?.nombre
      };
    }).filter(r => r.dia && r.hora); // Solo reservas con clase válida
    
    // Calcular próximas ocurrencias de cada clase
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const proximasClases = [];
    
    const diaMap = {
      'Lun': 1, // Lunes
      'Mar': 2, // Martes
      'Jue': 4, // Jueves
      'Sab': 6  // Sábado
    };
    
    for (const reserva of reservasConClase) {
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
      
      // Verificar si hay cancelación para esta fecha (usando API)
      try {
        const cancelacionesResponse = await fetch('http://localhost:8788/api/cancelaciones');
        if (cancelacionesResponse.ok) {
          const cancelacionesData = await cancelacionesResponse.json();
          const cancelaciones = Array.isArray(cancelacionesData) ? cancelacionesData : [];
          const tieneCancelacion = cancelaciones.some(c => 
            c.usuario_id === usuarioId && 
            c.clase_id === reserva.clase_id && 
            c.fecha_clase === fecha.toISOString().split('T')[0]
          );
          
          if (!tieneCancelacion) {
            proximasClases.push({
              fecha,
              clase: reserva,
              reserva
            });
          }
        } else {
          // Si no hay endpoint de cancelaciones o hay error, incluir la clase
          proximasClases.push({
            fecha,
            clase: reserva,
            reserva
          });
        }
      } catch (cancelError) {
        // Si hay error, incluir la clase
        proximasClases.push({
          fecha,
          clase: reserva,
          reserva
        });
      }
    }
    
    // Ordenar por fecha y tomar las primeras N
    proximasClases.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    return proximasClases.slice(0, limite);
  } catch (error) {
    console.error('[getProximasClases] Error:', error.message);
    return [];
  }
}

// Helper para formatear fecha como en producción: "Sábado 09:30 - 10 de enero"
function formatearFechaClase(fecha, hora) {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const dia = dias[fecha.getDay()];
  const diaNum = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  
  // Formato exacto de producción: "Sábado 09:30 - 10 de enero"
  return `${dia} ${hora} - ${diaNum} de ${mes}`;
}

// Función para enviar mensaje con botones
async function enviarMensajeConBotones(phoneNumberId, token, to, texto, botones) {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  try {
    const response = await fetch(url, {
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
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error al enviar mensaje:', JSON.stringify(responseData, null, 2));
      return { success: false, error: responseData };
    }
    
    return { success: true, data: responseData };
  } catch (error) {
    console.error('❌ Error de red:', error.message);
    return { success: false, error: error.message };
  }
}

// Función para enviar mensaje de texto
async function enviarMensajeTexto(phoneNumberId, token, to, text) {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  try {
    const response = await fetch(url, {
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
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error al enviar mensaje:', JSON.stringify(responseData, null, 2));
      return { success: false, error: responseData };
    }
    
    return { success: true, data: responseData };
  } catch (error) {
    console.error('❌ Error de red:', error.message);
    return { success: false, error: error.message };
  }
}

// Función principal
async function main() {
  console.log('🧪 Test de Respuesta de Producción\n');
  
  // Cargar variables de entorno
  const vars = loadDevVars();
  
  const WHATSAPP_TOKEN = vars.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = vars.PHONE_NUMBER_ID;
  
  // Validar variables
  if (!WHATSAPP_TOKEN || WHATSAPP_TOKEN.includes('tu_token')) {
    console.error('❌ Error: WHATSAPP_TOKEN no está configurado');
    process.exit(1);
  }
  
  if (!PHONE_NUMBER_ID || PHONE_NUMBER_ID.includes('tu_phone')) {
    console.error('❌ Error: PHONE_NUMBER_ID no está configurado');
    process.exit(1);
  }
  
  // Obtener número de destino
  const numeroDestino = process.argv[2] || '1165344775';
  const numeroLimpio = numeroDestino.replace(/\D/g, '');
  
  if (!numeroLimpio || numeroLimpio.length < 10) {
    console.error('❌ Error: Número de teléfono inválido');
    process.exit(1);
  }
  
  console.log('📋 Configuración:');
  console.log(`   Phone Number ID: ${PHONE_NUMBER_ID}`);
  console.log(`   Número destino: ${numeroLimpio}`);
  console.log(`   Últimos 8 dígitos: ${numeroLimpio.slice(-8)}`);
  console.log('');
  
  // Buscar usuario por últimos 8 dígitos
  console.log('🔍 Buscando usuario en la base de datos...');
  const usuario = await getUsuarioPorUltimos8Digitos(numeroLimpio);
  
  if (!usuario) {
    console.log('⚠️  Usuario no encontrado, enviando mensaje genérico...');
    const mensajeGen = `¡Hola! 👋\n\n¿Qué te gustaría hacer?`;
    const botones = [
      { id: 'cancelar', title: '❌ Cancelar clase' },
      { id: 'agendar', title: '✅ Reservar clase' },
      { id: 'ver_clases', title: '📅 Ver mis clases' }
    ];
    
    const resultado = await enviarMensajeConBotones(
      PHONE_NUMBER_ID,
      WHATSAPP_TOKEN,
      numeroLimpio,
      mensajeGen,
      botones
    );
    
    if (resultado.success) {
      console.log('✅ Mensaje genérico enviado');
    }
    process.exit(resultado.success ? 0 : 1);
  }
  
  console.log(`✅ Usuario encontrado: ${usuario.nombre} ${usuario.apellido}`);
  console.log('');
  
  // Obtener próximas 3 clases
  console.log('📅 Obteniendo próximas clases...');
  const proximasClases = await getProximasClases(usuario.id, 3);
  console.log(`✅ Encontradas ${proximasClases.length} clases próximas`);
  console.log('');
  
  // Enviar mensaje de bienvenida con botones (como en producción)
  // Capitalizar primera letra del nombre
  const nombreUsuario = usuario.nombre 
    ? usuario.nombre.charAt(0).toUpperCase() + usuario.nombre.slice(1).toLowerCase()
    : 'Usuario';
  const mensajeBienvenida = `Hola ${nombreUsuario}! 👋\n\n¿Qué te gustaría hacer?`;
  
  const botones = [
    { id: 'cancelar', title: '❌ Cancelar clase' },
    { id: 'agendar', title: '✅ Reservar clase' },
    { id: 'ver_clases', title: '📅 Ver mis clases' }
  ];
  
  // Esperar un poco antes de enviar el segundo mensaje (simular respuesta del bot)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('📤 Enviando mensaje de bienvenida...');
  const resultado1 = await enviarMensajeConBotones(
    PHONE_NUMBER_ID,
    WHATSAPP_TOKEN,
    numeroLimpio,
    mensajeBienvenida,
    botones
  );
  
  if (!resultado1.success) {
    console.error('❌ Error al enviar mensaje de bienvenida');
    process.exit(1);
  }
  
  console.log('✅ Mensaje de bienvenida enviado');
  
  // Si hay clases, enviar también el mensaje con las clases (simulando que el usuario hizo clic en "Ver mis clases")
  if (proximasClases.length > 0) {
    console.log('');
    console.log('📤 Enviando mensaje con próximas clases...');
    
    let mensajeClases = '📅 Tus próximas clases:\n\n';
    
    proximasClases.forEach((item, index) => {
      const fechaFormateada = formatearFechaClase(item.fecha, item.clase.hora);
      mensajeClases += `${index + 1}. ${fechaFormateada}\n`;
    });
    
    const resultado2 = await enviarMensajeTexto(
      PHONE_NUMBER_ID,
      WHATSAPP_TOKEN,
      numeroLimpio,
      mensajeClases
    );
    
    if (resultado2.success) {
      console.log('✅ Mensaje con clases enviado');
      console.log('\n📋 Clases enviadas:');
      proximasClases.forEach((item, index) => {
        const fechaFormateada = formatearFechaClase(item.fecha, item.clase.hora);
        console.log(`   ${index + 1}. ${fechaFormateada}`);
      });
    } else {
      console.error('❌ Error al enviar mensaje con clases');
    }
  } else {
    console.log('\n⚠️  El usuario no tiene clases próximas');
  }
  
  console.log('\n✅ ¡Prueba completada!');
  process.exit(0);
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});

