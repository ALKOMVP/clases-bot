/**
 * Script para generar 50 alumnos de prueba con reservas asignadas
 * 
 * Uso:
 *   npx tsx scripts/generate-test-users.ts
 * 
 * O desde Node.js:
 *   node --loader tsx scripts/generate-test-users.ts
 */

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

function generateEmail(nombre: string, apellido: string, index: number): string | null {
  // Algunos usuarios no tendrán email (para probar el campo opcional)
  if (Math.random() < 0.2) { // 20% sin email
    return null;
  }
  const baseEmail = `${nombre.toLowerCase()}.${apellido.toLowerCase()}${index}@example.com`;
  return baseEmail;
}

function generateFechaAlta(): string {
  const hoy = new Date();
  const diasAtras = getRandomInt(0, 365); // Último año
  const fecha = new Date(hoy);
  fecha.setDate(fecha.getDate() - diasAtras);
  return fecha.toISOString().split('T')[0];
}

async function generateTestUsers() {
  console.log('Generando 50 alumnos de prueba...\n');

  const usuarios: Array<{
    nombre: string;
    apellido: string;
    email: string | null;
    telefono: string;
    fecha_alta: string;
  }> = [];

  // Generar 50 usuarios únicos
  const nombresUsados = new Set<string>();
  const apellidosUsados = new Set<string>();
  
  for (let i = 0; i < 50; i++) {
    let nombre, apellido, nombreCompleto;
    do {
      nombre = getRandomElement(nombres);
      apellido = getRandomElement(apellidos);
      nombreCompleto = `${nombre} ${apellido}`;
    } while (nombresUsados.has(nombreCompleto));
    
    nombresUsados.add(nombreCompleto);
    
    usuarios.push({
      nombre,
      apellido,
      email: generateEmail(nombre, apellido, i),
      telefono: telefonos[i] || `+54 11 ${String(i).padStart(4, '0')}-${String(i + 1000).padStart(4, '0')}`,
      fecha_alta: generateFechaAlta()
    });
  }

  // Crear usuarios en la base de datos
  console.log('Creando usuarios en la base de datos...');
  for (const usuario of usuarios) {
    try {
      const response = await fetch('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuario)
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`Error creando ${usuario.nombre} ${usuario.apellido}:`, error);
      } else {
        console.log(`✓ ${usuario.nombre} ${usuario.apellido} creado`);
      }
    } catch (error) {
      console.error(`Error creando ${usuario.nombre} ${usuario.apellido}:`, error);
    }
  }

  // Obtener clases disponibles
  console.log('\nObteniendo clases disponibles...');
  const clasesResponse = await fetch('http://localhost:3000/api/clases');
  const clases = await clasesResponse.json();
  
  if (!Array.isArray(clases) || clases.length === 0) {
    console.error('No hay clases disponibles. Por favor, inicializa las clases primero.');
    return;
  }

  // Obtener usuarios creados (para obtener sus IDs)
  console.log('\nObteniendo IDs de usuarios creados...');
  const usuariosResponse = await fetch('http://localhost:3000/api/usuarios');
  const usuariosCreados = await usuariosResponse.json();
  
  if (!Array.isArray(usuariosCreados)) {
    console.error('Error obteniendo usuarios creados');
    return;
  }

  // Asignar reservas aleatorias (cada usuario tendrá entre 1 y 4 clases)
  console.log('\nAsignando reservas a usuarios...');
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
        const response = await fetch('http://localhost:3000/api/reservas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_id: usuario.id,
            clase_id: claseId
          })
        });
        
        if (!response.ok) {
          const error = await response.text();
          console.error(`Error asignando reserva a ${usuario.nombre} ${usuario.apellido}:`, error);
        } else {
          const clase = clases.find((c: any) => c.id === claseId);
          console.log(`✓ ${usuario.nombre} ${usuario.apellido} -> ${clase?.dia} ${clase?.hora}`);
        }
      } catch (error) {
        console.error(`Error asignando reserva:`, error);
      }
    }
  }

  console.log('\n✓ ¡50 alumnos de prueba creados exitosamente con reservas asignadas!');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateTestUsers().catch(console.error);
}

export { generateTestUsers };





