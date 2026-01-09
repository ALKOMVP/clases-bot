#!/usr/bin/env node

// Script para analizar código de WhatsApp recuperado y extraer la lógica del webhook

const fs = require('fs');
const path = require('path');

const codeFile = process.argv[2];

if (!codeFile || !fs.existsSync(codeFile)) {
  console.error('❌ Error: Archivo no encontrado');
  console.log('');
  console.log('Uso: node scripts/analyze-whatsapp-code.js <archivo-js>');
  console.log('');
  console.log('Este script analiza código JavaScript minificado o no minificado');
  console.log('y extrae la lógica relacionada con WhatsApp webhook.');
  process.exit(1);
}

console.log('📖 Analizando código de WhatsApp...');
console.log('');

const code = fs.readFileSync(codeFile, 'utf-8');

// Buscar patrones relacionados con WhatsApp
const patterns = {
  webhook: /webhook|whatsapp|WSP|wsp/gi,
  cancelar: /cancelar|cancel/i,
  agendar: /agendar|reservar|inscribir/i,
  verClases: /ver\s+(mis\s+)?clases|mis\s+clases/i,
  buttons: /button|buttons|interactive/i,
  list: /list|lista/i,
  message: /message|mensaje/i,
  phone: /phone|telefono|tel/i
};

console.log('🔍 Patrones encontrados:');
console.log('');

for (const [name, pattern] of Object.entries(patterns)) {
  const matches = code.match(pattern);
  if (matches) {
    console.log(`  ✅ ${name}: ${matches.length} ocurrencias`);
  }
}

// Intentar extraer funciones relacionadas
console.log('');
console.log('📝 Intentando extraer funciones...');
console.log('');

// Buscar funciones que contengan palabras clave
const functionPattern = /(?:function|const|let|var)\s+(\w+)\s*[=\(].*?(?:cancelar|agendar|ver.*clases|whatsapp|webhook).*?\{[\s\S]*?\}/gi;
let match;
const functions = [];

while ((match = functionPattern.exec(code)) !== null) {
  functions.push({
    name: match[1],
    code: match[0].substring(0, 500) // Primeros 500 caracteres
  });
}

if (functions.length > 0) {
  console.log(`✅ Encontradas ${functions.length} funciones relacionadas:`);
  functions.forEach((fn, i) => {
    console.log(`\n${i + 1}. ${fn.name}:`);
    console.log(fn.code.substring(0, 200) + '...');
  });
} else {
  console.log('⚠️ No se encontraron funciones con el patrón esperado');
  console.log('Esto puede ser porque el código está muy minificado');
}

// Buscar endpoints o rutas
console.log('');
console.log('🔗 Buscando endpoints/rutas...');
console.log('');

const routePattern = /\/api\/whatsapp[\/\w]*|webhook|route/gi;
const routes = code.match(routePattern);
if (routes) {
  console.log('Rutas encontradas:');
  [...new Set(routes)].forEach(route => console.log(`  - ${route}`));
}

// Guardar análisis
const analysis = {
  patterns: Object.fromEntries(
    Object.entries(patterns).map(([name, pattern]) => [
      name,
      (code.match(pattern) || []).length
    ])
  ),
  functions: functions.map(f => f.name),
  routes: [...new Set(routes || [])],
  codeLength: code.length,
  timestamp: new Date().toISOString()
};

fs.writeFileSync(
  path.join(path.dirname(codeFile), 'analysis.json'),
  JSON.stringify(analysis, null, 2)
);

console.log('');
console.log('✅ Análisis guardado en: analysis.json');
console.log('');
console.log('💡 Próximos pasos:');
console.log('  1. Revisa el código original para entender la estructura');
console.log('  2. Busca las funciones que manejan: cancelar, agendar, ver clases');
console.log('  3. Identifica cómo se envían mensajes interactivos (botones/listas)');
console.log('  4. Reconstruye el webhook basándote en la lógica encontrada');
console.log('');

