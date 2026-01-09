-- Migración 0009: Crear tabla clase_recuperar
-- Esta tabla almacena las clases a recuperar que se asignan cuando un usuario cancela una clase
-- Cada clase a recuperar tiene un vencimiento de 30 días desde la fecha de cancelación

CREATE TABLE IF NOT EXISTS clase_recuperar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  fecha_creacion TEXT NOT NULL, -- Fecha en que se canceló la clase original (ISO format: YYYY-MM-DD)
  fecha_vencimiento TEXT NOT NULL, -- Fecha de vencimiento (30 días después de fecha_creacion)
  clase_id INTEGER, -- ID de la clase original cancelada (opcional, para referencia)
  fecha_clase_cancelada TEXT, -- Fecha específica de la clase cancelada (opcional)
  usado INTEGER DEFAULT 0, -- 0 = no usado, 1 = usado
  fecha_uso TEXT, -- Fecha en que se usó la clase a recuperar (si se usó)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  FOREIGN KEY (clase_id) REFERENCES clase(id)
);

CREATE INDEX IF NOT EXISTS idx_clase_recuperar_usuario ON clase_recuperar(usuario_id);
CREATE INDEX IF NOT EXISTS idx_clase_recuperar_vencimiento ON clase_recuperar(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_clase_recuperar_usado ON clase_recuperar(usuario_id, usado);

