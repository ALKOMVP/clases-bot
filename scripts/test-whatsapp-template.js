#!/usr/bin/env node

/**
 * Script para probar envío de plantilla de WhatsApp (SIN parámetros)
 * Uso:
 *   node scripts/test-whatsapp-template.js [numero] [templateName]
 * Ej:
 *   node scripts/test-whatsapp-template.js 1165344775 confirmar_reserva
 */

const fs = require('fs');
const path = require('path');

function loadDevVars() {
  const devVarsPath = path.join(__dirname, '..', '.dev.vars');

  if (!fs.existsSync(devVarsPath)) {
    console.error('❌ Error: No se encontró el archivo .dev.vars');
    process.exit(1);
  }

  const content = fs.readFileSync(devVarsPath, 'utf-8');
  const vars = {};

  content.split('\n').forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      vars[match[1].trim()] = match[2].trim();
    }
  });

  return vars;
}

function normalizarTelefonoWhatsApp(telefono) {
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

async function enviarTemplate({ phoneNumberId, token, to, templateName, lang }) {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const resp = await fetch(url, {
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
        language: { code: lang },
      },
    }),
  });

  const text = await resp.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }

  return { ok: resp.ok, status: resp.status, text, json };
}

async function main() {
  const vars = loadDevVars();

  const WHATSAPP_TOKEN = vars.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = vars.PHONE_NUMBER_ID;

  if (!WHATSAPP_TOKEN || WHATSAPP_TOKEN.includes('tu_token') || WHATSAPP_TOKEN.includes('aqui')) {
    console.error('❌ Error: WHATSAPP_TOKEN no está configurado correctamente en .dev.vars');
    process.exit(1);
  }

  if (!PHONE_NUMBER_ID || PHONE_NUMBER_ID.includes('tu_phone') || PHONE_NUMBER_ID.includes('aqui')) {
    console.error('❌ Error: PHONE_NUMBER_ID no está configurado correctamente en .dev.vars');
    process.exit(1);
  }

  const numero = process.argv[2] || '1165344775';
  const templateName = process.argv[3] || 'confirmar_reserva';
  const to = normalizarTelefonoWhatsApp(numero);

  const langs = [
    vars.WHATSAPP_TEMPLATE_LANG,
    'es_AR',
    'es',
    'es_ES',
  ].filter(Boolean);

  // unique
  const seen = new Set();
  const langCandidates = langs.filter((l) => (seen.has(l) ? false : (seen.add(l), true)));

  console.log('📨 Enviando template (sin parámetros)');
  console.log(`   to: ${to}`);
  console.log(`   template: ${templateName}`);
  console.log(`   langs: ${langCandidates.join(', ')}`);

  for (const lang of langCandidates) {
    console.log(`\n➡️ Intentando lang=${lang}...`);
    const res = await enviarTemplate({
      phoneNumberId: PHONE_NUMBER_ID,
      token: WHATSAPP_TOKEN,
      to,
      templateName,
      lang,
    });

    if (res.ok) {
      console.log('✅ OK');
      if (res.json) console.log(JSON.stringify(res.json, null, 2));
      process.exit(0);
    } else {
      console.log(`❌ FAIL status=${res.status}`);
      if (res.json) console.log(JSON.stringify(res.json, null, 2));
      else console.log(res.text);
    }
  }

  process.exit(1);
}

main().catch((e) => {
  console.error('❌ Error inesperado:', e);
  process.exit(1);
});

