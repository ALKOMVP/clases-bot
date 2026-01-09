#!/usr/bin/env node

/**
 * Script para probar el envío del menú principal de WhatsApp
 * Simula la respuesta que el bot envía cuando recibe un mensaje no reconocido
 * Uso: node scripts/test-whatsapp-menu.js [numero]
 */

const fs = require('fs');
const path = require('path');

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

// Función para enviar mensaje con botones a WhatsApp
async function enviarMensajeConBotones(phoneNumberId, token, to, texto, botones) {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  console.log('📤 Enviando menú interactivo...');
  console.log(`   URL: ${url}`);
  console.log(`   A: ${to}`);
  console.log(`   Mensaje: ${texto}`);
  console.log(`   Botones: ${botones.map(b => b.title).join(', ')}`);
  console.log('');
  
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
      console.error('❌ Error al enviar mensaje:');
      console.error(JSON.stringify(responseData, null, 2));
      return { success: false, error: responseData };
    }
    
    console.log('✅ Menú enviado exitosamente!');
    console.log('📋 Respuesta:', JSON.stringify(responseData, null, 2));
    return { success: true, data: responseData };
  } catch (error) {
    console.error('❌ Error de red:', error.message);
    return { success: false, error: error.message };
  }
}

// Función principal
async function main() {
  console.log('🧪 Test de Menú Interactivo WhatsApp\n');
  
  // Cargar variables de entorno
  const vars = loadDevVars();
  
  const WHATSAPP_TOKEN = vars.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = vars.PHONE_NUMBER_ID;
  
  // Validar variables
  if (!WHATSAPP_TOKEN || WHATSAPP_TOKEN.includes('tu_token') || WHATSAPP_TOKEN.includes('aqui')) {
    console.error('❌ Error: WHATSAPP_TOKEN no está configurado correctamente');
    process.exit(1);
  }
  
  if (!PHONE_NUMBER_ID || PHONE_NUMBER_ID.includes('tu_phone') || PHONE_NUMBER_ID.includes('aqui')) {
    console.error('❌ Error: PHONE_NUMBER_ID no está configurado correctamente');
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
  console.log(`   Token: ${WHATSAPP_TOKEN.substring(0, 20)}...`);
  console.log(`   Phone Number ID: ${PHONE_NUMBER_ID}`);
  console.log(`   Número destino: ${numeroLimpio}`);
  console.log('');
  
  // Simular la respuesta del bot cuando recibe un mensaje no reconocido
  // Esto es lo que el webhook envía según el código en route.ts
  const mensajeBienvenida = `¡Hola! 👋\n\n¿En qué te puedo ayudar?`;
  
  const botones = [
    { id: 'ver_clases', title: '📅 Ver mis clases' },
    { id: 'agendar', title: '📚 Agendar' },
    { id: 'cancelar', title: '❌ Cancelar' }
  ];
  
  console.log('💬 Simulando respuesta del bot:');
  console.log(`   Mensaje recibido: "cualquier cosa"`);
  console.log(`   Respuesta: Menú interactivo con 3 opciones`);
  console.log('');
  
  // Enviar mensaje con botones
  const resultado = await enviarMensajeConBotones(
    PHONE_NUMBER_ID,
    WHATSAPP_TOKEN,
    numeroLimpio,
    mensajeBienvenida,
    botones
  );
  
  if (resultado.success) {
    console.log('\n✅ ¡Menú enviado exitosamente!');
    console.log(`El usuario ${numeroLimpio} recibirá el menú interactivo`);
    console.log('\n📱 El usuario podrá hacer clic en:');
    console.log('   - 📅 Ver mis clases');
    console.log('   - 📚 Agendar');
    console.log('   - ❌ Cancelar');
    process.exit(0);
  } else {
    console.log('\n❌ Error al enviar menú');
    process.exit(1);
  }
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});

