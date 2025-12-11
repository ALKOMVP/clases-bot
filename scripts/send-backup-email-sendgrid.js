#!/usr/bin/env node

/**
 * Script para enviar backup por email usando SendGrid
 * Requiere variables de entorno:
 * - SENDGRID_API_KEY: API Key de SendGrid
 * - EMAIL_TO: Email destino (solverive@gmail.com)
 * - EMAIL_FROM: Email desde el que se envía (debe estar verificado en SendGrid)
 * - BACKUP_FILE: Ruta al archivo de backup
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const EMAIL_TO = process.env.EMAIL_TO || 'solverive@gmail.com';
const EMAIL_FROM = process.env.EMAIL_FROM || 'solverive@gmail.com';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const BACKUP_FILE = process.env.BACKUP_FILE;

if (!SENDGRID_API_KEY || !BACKUP_FILE) {
  console.error('❌ Faltan variables de entorno requeridas:');
  console.error('   - SENDGRID_API_KEY: API Key de SendGrid');
  console.error('   - BACKUP_FILE: Ruta al archivo de backup');
  console.error('   - EMAIL_FROM: (opcional) Email desde el que se envía');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_FILE)) {
  console.error(`❌ El archivo de backup no existe: ${BACKUP_FILE}`);
  process.exit(1);
}

const fileStats = fs.statSync(BACKUP_FILE);
const fileSize = (fileStats.size / 1024).toFixed(2); // KB
const fileName = path.basename(BACKUP_FILE);
const timestamp = new Date().toLocaleString('es-AR', { 
  timeZone: 'America/Argentina/Buenos_Aires',
  dateStyle: 'long',
  timeStyle: 'short'
});

// Leer el archivo de backup y convertirlo a base64
const backupContent = fs.readFileSync(BACKUP_FILE);
const backupBase64 = backupContent.toString('base64');

// Preparar el email
const emailData = {
  personalizations: [{
    to: [{ email: EMAIL_TO }],
    subject: `📦 Backup Semanal - Clases Bot - ${timestamp}`
  }],
  from: {
    email: EMAIL_FROM,
    name: 'Clases Bot Backup'
  },
  content: [{
    type: 'text/html',
    value: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">📦 Backup Semanal - Clases Bot</h2>
        <p>Hola,</p>
        <p>Se ha generado el backup semanal de la base de datos de Clases Bot.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>📄 Archivo:</strong> ${fileName}</p>
          <p><strong>📊 Tamaño:</strong> ${fileSize} KB</p>
          <p><strong>📅 Fecha:</strong> ${timestamp}</p>
        </div>
        <p>El archivo de backup está adjunto a este email.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          Este es un email automático generado por el sistema de backups de Clases Bot.
        </p>
      </div>
    `
  }],
  attachments: [{
    content: backupBase64,
    filename: fileName,
    type: 'application/sql',
    disposition: 'attachment'
  }]
};

const postData = JSON.stringify(emailData);

const options = {
  hostname: 'api.sendgrid.com',
  port: 443,
  path: '/v3/mail/send',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log(`📧 Enviando backup a ${EMAIL_TO} usando SendGrid...`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 202) {
      console.log('✅ Email enviado exitosamente!');
    } else {
      console.error(`❌ Error al enviar email: ${res.statusCode}`);
      console.error(`Respuesta: ${data}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error al enviar email:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();





