'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log el error global en la consola
    console.error('=== GLOBAL ERROR ===', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      name: error.name,
      timestamp: new Date().toISOString()
    });
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Error del Sistema</h1>
            <p className="text-gray-600 mb-4">{error.message || 'Ha ocurrido un error crítico'}</p>
            {error.digest && (
              <p className="text-sm text-gray-500 mb-4">Error ID: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

