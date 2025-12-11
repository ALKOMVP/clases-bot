// Script para generar clases semanales
// Ejecutar con: npx tsx scripts/generate-weekly-classes.ts

const horarios = {
  'Lunes': ['17:30', '19:00'],
  'Martes': ['10:00', '17:30', '19:00'],
  'Jueves': ['10:00', '16:00', '17:30', '19:00'],
  'Sábado': ['09:30', '11:00'],
};

function getDayOfWeek(date: Date): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[date.getDay()];
}

function getNextDate(dayName: string, startDate: Date = new Date()): Date {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const targetDay = days.indexOf(dayName);
  const currentDay = startDate.getDay();
  
  let daysUntilTarget = targetDay - currentDay;
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7;
  }
  
  const nextDate = new Date(startDate);
  nextDate.setDate(startDate.getDate() + daysUntilTarget);
  return nextDate;
}

function generateClassesForWeeks(weeks: number = 12): string[] {
  const sqlStatements: string[] = [];
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  
  for (let week = 0; week < weeks; week++) {
    for (const [day, hours] of Object.entries(horarios)) {
      const date = getNextDate(day, new Date(startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      
      for (const hour of hours) {
        sqlStatements.push(
          `INSERT OR IGNORE INTO clase (fecha, hora, nombre, profesor, sala) VALUES ('${dateStr}', '${hour}:00', 'Yoga', 'Profesora', 'Sala 1');`
        );
      }
    }
  }
  
  return sqlStatements;
}

// Ejemplo de uso
if (require.main === module) {
  const classes = generateClassesForWeeks(12);
  console.log('-- Clases generadas para las próximas 12 semanas\n');
  classes.forEach(sql => console.log(sql));
}

export { generateClassesForWeeks };






