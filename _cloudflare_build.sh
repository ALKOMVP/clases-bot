#!/bin/bash
# Script de build para Cloudflare Pages
set -e

echo "Instalando dependencias..."
npm ci

echo "Ejecutando build para Cloudflare..."
npm run build:cloudflare

echo "Build completado exitosamente"

