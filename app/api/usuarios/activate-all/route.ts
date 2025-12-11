import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  
  try {
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
    }
    
    if (!db) {
      db = getMockDBInstance();
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    // Obtener todos los usuarios
    const usuariosResult = await db.prepare('SELECT * FROM usuario').all();
    const usuarios = (usuariosResult?.results || []) as any[];
    
    let activados = 0;
    let yaActivos = 0;

    // Activar todos los usuarios que no estén activos
    for (const usuario of usuarios) {
      const activo = usuario.activo === 1 || usuario.activo === true;
      
      if (!activo) {
        try {
          await db.prepare(
            'UPDATE usuario SET activo = ? WHERE id = ?'
          ).bind(1, usuario.id).run();
          activados++;
        } catch (error: any) {
          console.error(`Error activando usuario ${usuario.id}:`, error);
        }
      } else {
        yaActivos++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Se activaron ${activados} usuarios. ${yaActivos} ya estaban activos.`,
      activados,
      yaActivos,
      total: usuarios.length
    });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al activar usuarios',
      { route: '/api/usuarios/activate-all', method: 'POST', operation: 'activate_all_users' }
    );
  }
}

