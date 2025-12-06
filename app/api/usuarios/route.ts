import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, checkDatabaseAvailability, getEnvironmentInfo } from '@/lib/error-handler';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/usuarios] Starting request', { environment: envInfo.environment });
  
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[PUT /api/usuarios] DB obtained from process.env');
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
        console.log('[PUT /api/usuarios] Using mock DB (development)');
      } else {
        const dbCheck = checkDatabaseAvailability(db, '/api/usuarios');
        if (dbCheck.error) return dbCheck.error;
      }
    }
    
    const dbCheck = checkDatabaseAvailability(db, '/api/usuarios');
    if (!dbCheck.available && dbCheck.error) {
      return dbCheck.error;
    }

    const { id, nombre, apellido, email, fecha_alta } = await request.json();

    if (!id || !nombre || !apellido || !email) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    await db.prepare(
      'UPDATE usuario SET nombre = ?, apellido = ?, email = ?, fecha_alta = ? WHERE id = ?'
    ).bind(nombre, apellido, email, fecha_alta, id).run();

    console.log('[PUT /api/usuarios] Success', { id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al actualizar usuario',
      { route: '/api/usuarios', method: 'PUT', operation: 'update_usuario' }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[DELETE /api/usuarios] Starting request', { environment: envInfo.environment });
  
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[DELETE /api/usuarios] DB obtained from process.env');
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
        console.log('[DELETE /api/usuarios] Using mock DB (development)');
      } else {
        const dbCheck = checkDatabaseAvailability(db, '/api/usuarios');
        if (dbCheck.error) return dbCheck.error;
      }
    }
    
    const dbCheck = checkDatabaseAvailability(db, '/api/usuarios');
    if (!dbCheck.available && dbCheck.error) {
      return dbCheck.error;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await db.prepare('DELETE FROM usuario WHERE id = ?').bind(id).run();

    console.log('[DELETE /api/usuarios] Success', { id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al eliminar usuario',
      { route: '/api/usuarios', method: 'DELETE', operation: 'delete_usuario' }
    );
  }
}
