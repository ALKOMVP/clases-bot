-- Tabla de usuarios (alumnos)
CREATE TABLE IF NOT EXISTS usuario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  fecha_alta DATE NOT NULL DEFAULT (date('now'))
);

-- Tabla de clases semanales (horarios fijos que se repiten cada semana)
CREATE TABLE IF NOT EXISTS clase (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dia VARCHAR(10) NOT NULL, -- 'Lun', 'Mar', 'Jue', 'Sab'
  hora TIME NOT NULL,
  nombre VARCHAR(100) NOT NULL DEFAULT 'Yoga',
  UNIQUE(dia, hora)
);

-- Tabla de reservas (inscripciones de alumnos a clases semanales)
CREATE TABLE IF NOT EXISTS reserva (
  usuario_id INTEGER NOT NULL,
  clase_id INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (usuario_id, clase_id),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
  FOREIGN KEY (clase_id) REFERENCES clase(id) ON DELETE CASCADE
);

-- Las clases se pueden crear manualmente desde la interfaz
-- O usar el script scripts/generate-weekly-classes.ts para generar clases semanales

