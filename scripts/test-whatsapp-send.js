#!/usr/bin/env node

/**
 * Script para probar el envío de mensajes de WhatsApp
 * Uso: node scripts/test-whatsapp-send.js [numero] [mensaje]
 * Ejemplo: node scripts/test-whatsapp-send.js 1165344775 "Hola, esto es una prueba"
 */

const fs = require('fs');
const path = require('path');

// Cargar variables de .dev.vars
function loadDevVars() {
  const devVarsPath = path.join(__dirname, '..', '.dev.vars');
  
  if (!fs.existsSync(devVarsPath)) {
    console.error('❌ Error: No se encontró el archivo .dev.vars');
    console.log('Asegúrate de que el archivo existe en la raíz del proyecto');
    process.exit(1);
  }
  
  const content = fs.readFileSync(devVarsPath, 'utf-8');
  const vars = {};
  
  // Parsear variables (formato: KEY=value)
  content.split('\n').forEach(line => {
    line = line.trim();
    // Ignorar comentarios y líneas vacías
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

// Función para enviar mensaje de texto a WhatsApp
async function enviarMensajeTexto(phoneNumberId, token, to, text) {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  console.log('📤 Enviando mensaje...');
  console.log(`   URL: ${url}`);
  console.log(`   A: ${to}`);
  console.log(`   Mensaje: ${text}`);
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
        type: 'text',
        text: { body: text }
      })
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error al enviar mensaje:');
      console.error(JSON.stringify(responseData, null, 2));
      return { success: false, error: responseData };
    }
    
    console.log('✅ Mensaje enviado exitosamente!');
    console.log('📋 Respuesta:', JSON.stringify(responseData, null, 2));
    return { success: true, data: responseData };
  } catch (error) {
    console.error('❌ Error de red:', error.message);
    return { success: false, error: error.message };
  }
}

// Función principal
async function main() {
  console.log('🧪 Test de Envío de Mensaje WhatsApp\n');
  
  // Cargar variables de entorno
  const vars = loadDevVars();
  
  const WHATSAPP_TOKEN = vars.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = vars.PHONE_NUMBER_ID;
  
  // Validar variables
  if (!WHATSAPP_TOKEN || WHATSAPP_TOKEN.includes('tu_token') || WHATSAPP_TOKEN.includes('aqui')) {
    console.error('❌ Error: WHATSAPP_TOKEN no está configurado correctamente en .dev.vars');
    console.log('Por favor, actualiza el valor de WHATSAPP_TOKEN con tu token real');
    process.exit(1);
  }
  
  if (!PHONE_NUMBER_ID || PHONE_NUMBER_ID.includes('tu_phone') || PHONE_NUMBER_ID.includes('aqui')) {
    console.error('❌ Error: PHONE_NUMBER_ID no está configurado correctamente en .dev.vars');
    console.log('Por favor, actualiza el valor de PHONE_NUMBER_ID con tu ID real');
    process.exit(1);
  }
  
  // Obtener número de destino y mensaje de argumentos
  const numeroDestino = process.argv[2] || '1165344775';
  const mensaje = process.argv[3] || '🧪 Mensaje de prueba desde Clases Bot';
  
  // Validar formato del número (debe ser solo números, sin +)
  const numeroLimpio = numeroDestino.replace(/\D/g, '');
  
  if (!numeroLimpio || numeroLimpio.length < 10) {
    console.error('❌ Error: Número de teléfono inválido');
    console.log('El número debe contener al menos 10 dígitos');
    process.exit(1);
  }
  
  console.log('📋 Configuración:');
  console.log(`   Token: ${WHATSAPP_TOKEN.substring(0, 20)}...`);
  console.log(`   Phone Number ID: ${PHONE_NUMBER_ID}`);
  console.log(`   Número destino: ${numeroLimpio}`);
  console.log('');
  
  // Enviar mensaje
  const resultado = await enviarMensajeTexto(
    PHONE_NUMBER_ID,
    WHATSAPP_TOKEN,
    numeroLimpio,
    mensaje
  );
  
  if (resultado.success) {
    console.log('\n✅ ¡Prueba exitosa!');
    console.log(`El mensaje fue enviado al número ${numeroLimpio}`);
    process.exit(0);
  } else {
    console.log('\n❌ Prueba fallida');
    process.exit(1);
  }
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});

