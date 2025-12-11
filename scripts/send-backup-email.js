#!/usr/bin/env node

/**
 * Script para enviar backup por email
 * Requiere variables de entorno:
 * - EMAIL_FROM: Email desde el que se envía
 * - EMAIL_PASSWORD: Contraseña de aplicación de Gmail (o contraseña del email)
 * - EMAIL_TO: Email destino (solverive@gmail.com)
 * - BACKUP_FILE: Ruta al archivo de backup
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const EMAIL_TO = process.env.EMAIL_TO || 'solverive@gmail.com';
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const BACKUP_FILE = process.env.BACKUP_FILE;

if (!EMAIL_FROM || !EMAIL_PASSWORD || !BACKUP_FILE) {
  console.error('❌ Faltan variables de entorno requeridas:');
  console.error('   - EMAIL_FROM: Email desde el que se envía');
  console.error('   - EMAIL_PASSWORD: Contraseña de aplicación de Gmail');
  console.error('   - BACKUP_FILE: Ruta al archivo de backup');
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

async function sendEmail() {
  try {
    // Configurar transporter para Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_FROM,
        pass: EMAIL_PASSWORD,
      },
    });

    // Leer el archivo de backup
    const backupContent = fs.readFileSync(BACKUP_FILE);

    // Configurar el email
    const mailOptions = {
      from: `"Clases Bot Backup" <${EMAIL_FROM}>`,
      to: EMAIL_TO,
      subject: `📦 Backup Semanal - Clases Bot - ${timestamp}`,
      html: `
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
      `,
      text: `
Backup Semanal - Clases Bot

Archivo: ${fileName}
Tamaño: ${fileSize} KB
Fecha: ${timestamp}

El archivo de backup está adjunto a este email.
      `,
      attachments: [
        {
          filename: fileName,
          content: backupContent,
        },
      ],
    };

    console.log(`📧 Enviando backup a ${EMAIL_TO}...`);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado exitosamente!');
    console.log(`📬 Message ID: ${info.messageId}`);
  } catch (error) {
    console.error('❌ Error al enviar email:', error.message);
    process.exit(1);
  }
}

sendEmail();





