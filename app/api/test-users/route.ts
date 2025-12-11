import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

const nombres = [
  'María', 'Juan', 'Ana', 'Carlos', 'Laura', 'Pedro', 'Carmen', 'Luis', 'Sofía', 'Miguel',
  'Elena', 'Diego', 'Patricia', 'Fernando', 'Isabel', 'Roberto', 'Lucía', 'Javier', 'Marta', 'Antonio',
  'Cristina', 'Álvaro', 'Pilar', 'Manuel', 'Raquel', 'David', 'Teresa', 'José', 'Natalia', 'Francisco',
  'Beatriz', 'Alejandro', 'Rosa', 'Rafael', 'Silvia', 'Ángel', 'Mercedes', 'Vicente', 'Dolores', 'Enrique',
  'Concepción', 'Jorge', 'Amparo', 'Ricardo', 'Montserrat', 'Óscar', 'Esperanza', 'Sergio', 'Encarnación', 'Rubén'
];

const apellidos = [
  'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín',
  'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez',
  'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Suárez',
  'Molina', 'Morales', 'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Iglesias',
  'Nuñez', 'Medina', 'Garrido', 'Cortés', 'Castillo', 'Lozano', 'Guerrero', 'Cano', 'Prieto', 'Méndez'
];

const telefonos = [
  '+54 11 1234-5678', '+54 11 2345-6789', '+54 11 3456-7890', '+54 11 4567-8901', '+54 11 5678-9012',
  '+54 11 6789-0123', '+54 11 7890-1234', '+54 11 8901-2345', '+54 11 9012-3456', '+54 11 0123-4567',
  '+54 11 1111-2222', '+54 11 2222-3333', '+54 11 3333-4444', '+54 11 4444-5555', '+54 11 5555-6666',
  '+54 11 6666-7777', '+54 11 7777-8888', '+54 11 8888-9999', '+54 11 9999-0000', '+54 11 0000-1111',
  '+54 11 1112-2233', '+54 11 2233-4455', '+54 11 3344-5566', '+54 11 4455-6677', '+54 11 5566-7788',
  '+54 11 6677-8899', '+54 11 7788-9900', '+54 11 8899-0011', '+54 11 9900-1122', '+54 11 0011-2233',
  '+54 11 1122-3344', '+54 11 2233-4455', '+54 11 3344-5566', '+54 11 4455-6677', '+54 11 5566-7788',
  '+54 11 6677-8899', '+54 11 7788-9900', '+54 11 8899-0011', '+54 11 9900-1122', '+54 11 0011-2233',
  '+54 11 1122-3344', '+54 11 2233-4455', '+54 11 3344-5566', '+54 11 4455-6677', '+54 11 5566-7788',
  '+54 11 6677-8899', '+54 11 7788-9900', '+54 11 8899-0011', '+54 11 9900-1122', '+54 11 0011-2233'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function generateFechaAlta(): string {
  const hoy = new Date();
  const diasAtras = getRandomInt(0, 365);
  const fecha = new Date(hoy);
  fecha.setDate(fecha.getDate() - diasAtras);
  return fecha.toISOString().split('T')[0];
}

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

    // Obtener clases disponibles
    const clasesResult = await db.prepare('SELECT * FROM clase').all();
    const clases = (clasesResult?.results || []) as any[];
    
    if (clases.length === 0) {
      return NextResponse.json({ error: 'No hay clases disponibles. Por favor, inicializa las clases primero.' }, { status: 400 });
    }

    const usuariosCreados: any[] = [];
    const nombresUsados = new Set<string>();

    // Generar 50 usuarios
    for (let i = 0; i < 50; i++) {
      let nombre, apellido, nombreCompleto;
      do {
        nombre = getRandomElement(nombres);
        apellido = getRandomElement(apellidos);
        nombreCompleto = `${nombre} ${apellido}`;
      } while (nombresUsados.has(nombreCompleto));
      
      nombresUsados.add(nombreCompleto);
      
      const telefono = telefonos[i] || `+54 11 ${String(i).padStart(4, '0')}-${String(i + 1000).padStart(4, '0')}`;
      const fechaAlta = generateFechaAlta();
      // 80% activos, 20% desactivados para tener variedad
      const activo = Math.random() > 0.2 ? 1 : 0;

      try {
        const result = await db.prepare(
          'INSERT INTO usuario (nombre, apellido, telefono, fecha_alta, activo) VALUES (?, ?, ?, ?, ?)'
        ).bind(nombre, apellido, telefono, fechaAlta, activo).run();
        
        const lastRowId = result && typeof result === 'object' 
          ? (result as any).meta?.last_row_id || (result as any).last_row_id
          : null;
        
        if (lastRowId) {
          usuariosCreados.push({ id: lastRowId, nombre, apellido });
        }
      } catch (error: any) {
        // Continuar si hay error
        console.error(`Error creando usuario ${nombre} ${apellido}:`, error.message);
      }
    }

    // Asignar reservas aleatorias (cada usuario tendrá entre 1 y 4 clases)
    let reservasCreadas = 0;
    for (const usuario of usuariosCreados) {
      const numReservas = getRandomInt(1, 4);
      const clasesAsignadas = new Set<number>();
      
      for (let i = 0; i < numReservas; i++) {
        let claseId;
        do {
          const clase = getRandomElement(clases);
          claseId = clase.id;
        } while (clasesAsignadas.has(claseId));
        
        clasesAsignadas.add(claseId);
        
        try {
          await db.prepare(
            'INSERT OR IGNORE INTO reserva (usuario_id, clase_id, created_at) VALUES (?, ?, ?)'
          ).bind(usuario.id, claseId, new Date().toISOString()).run();
          reservasCreadas++;
        } catch (error: any) {
          // Ignorar errores de duplicados
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${usuariosCreados.length} alumnos creados con ${reservasCreadas} reservas asignadas` 
    });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al generar usuarios de prueba',
      { route: '/api/test-users', method: 'POST', operation: 'generate_test_users' }
    );
  }
}




