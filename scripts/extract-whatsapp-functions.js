#!/usr/bin/env node

// Script para extraer funciones del webhook de WhatsApp desde código minificado

const fs = require('fs');
const path = require('path');

const chunkFile = process.argv[2] || 'recovered-assets/chunks/964-13036fef2dc48ea1.js';

if (!fs.existsSync(chunkFile)) {
  console.error('❌ Archivo no encontrado:', chunkFile);
  process.exit(1);
}

console.log('📖 Analizando:', chunkFile);
console.log('');

const code = fs.readFileSync(chunkFile, 'utf-8');

// Buscar secciones relacionadas con WhatsApp
const patterns = {
  webhook: /webhook|whatsapp/gi,
  cancelar: /cancelar|cancel/i,
  agendar: /agendar|reservar|inscribir/i,
  verClases: /ver.*clases|ver mis clases|mis clases/i,
  apiRoute: /\/api\/whatsapp/i,
  POST: /POST|post|method.*POST/i,
  GET: /GET|get|method.*GET/i,
};

console.log('=== Análisis de Patrones ===');
for (const [name, pattern] of Object.entries(patterns)) {
  const matches = code.match(pattern);
  if (matches) {
    console.log(`✅ ${name}: ${matches.length} ocurrencias`);
  } else {
    console.log(`❌ ${name}: No encontrado`);
  }
}

console.log('');
console.log('=== Buscando Funciones ===');

// Buscar funciones que contengan palabras clave
const functionPatterns = [
  /function\s+\w+.*?(?:whatsapp|webhook|cancelar|agendar|ver.*clases).*?\{[\s\S]{0,5000}\}/gi,
  /const\s+\w+.*?=.*?(?:whatsapp|webhook|cancelar|agendar|ver.*clases).*?=>.*?\{[\s\S]{0,5000}\}/gi,
  /async\s+function.*?(?:whatsapp|webhook).*?\{[\s\S]{0,5000}\}/gi,
];

let foundFunctions = [];

for (const pattern of functionPatterns) {
  const matches = code.match(pattern);
  if (matches) {
    foundFunctions = foundFunctions.concat(matches);
  }
}

if (foundFunctions.length > 0) {
  console.log(`✅ Encontradas ${foundFunctions.length} funciones potenciales`);
  foundFunctions.forEach((func, i) => {
    console.log(`\n--- Función ${i + 1} (primeros 200 caracteres) ---`);
    console.log(func.substring(0, 200) + '...');
  });
} else {
  console.log('⚠️  No se encontraron funciones completas');
}

// Buscar líneas con contexto
console.log('');
console.log('=== Líneas con Contexto ===');
const lines = code.split('\n');
let contextLines = [];

lines.forEach((line, index) => {
  if (/whatsapp|webhook|cancelar|agendar|ver.*clases/i.test(line)) {
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length, index + 3);
    contextLines.push({
      lineNum: index + 1,
      context: lines.slice(start, end).join('\n')
    });
  }
});

if (contextLines.length > 0) {
  console.log(`✅ Encontradas ${contextLines.length} líneas con contexto`);
  contextLines.slice(0, 5).forEach(({ lineNum, context }) => {
    console.log(`\n--- Línea ${lineNum} ---`);
    console.log(context);
  });
} else {
  console.log('⚠️  No se encontraron líneas con contexto');
}

// Guardar resultados
const outputDir = 'recovered-assets/analysis';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const output = {
  patterns: Object.fromEntries(
    Object.entries(patterns).map(([name, pattern]) => [
      name,
      code.match(pattern) ? code.match(pattern).length : 0
    ])
  ),
  functionsFound: foundFunctions.length,
  contextLines: contextLines.length,
  sampleContext: contextLines.slice(0, 10).map(({ lineNum, context }) => ({
    line: lineNum,
    context: context.substring(0, 500)
  }))
};

fs.writeFileSync(
  path.join(outputDir, 'whatsapp-analysis.json'),
  JSON.stringify(output, null, 2)
);

console.log('');
console.log('✅ Análisis guardado en:', path.join(outputDir, 'whatsapp-analysis.json'));

