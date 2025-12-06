import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, checkDatabaseAvailability, getEnvironmentInfo } from '@/lib/error-handler';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

// Clases semanales fijas
const CLASES_FIJAS = [
  // Lunes
  { dia: 'Lun', hora: '17:30', nombre: 'Yoga' },
  { dia: 'Lun', hora: '19:00', nombre: 'Yoga' },
  // Martes
  { dia: 'Mar', hora: '10:00', nombre: 'Yoga' },
  { dia: 'Mar', hora: '17:30', nombre: 'Yoga' },
  { dia: 'Mar', hora: '19:00', nombre: 'Yoga' },
  // Jueves
  { dia: 'Jue', hora: '10:00', nombre: 'Yoga' },
  { dia: 'Jue', hora: '16:00', nombre: 'Yoga' },
  { dia: 'Jue', hora: '17:30', nombre: 'Yoga' },
  { dia: 'Jue', hora: '19:00', nombre: 'Yoga' },
  // Sábado
  { dia: 'Sab', hora: '09:30', nombre: 'Yoga' },
  { dia: 'Sab', hora: '11:00', nombre: 'Yoga' },
];

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/clases] Starting request', { environment: envInfo.environment });
  
