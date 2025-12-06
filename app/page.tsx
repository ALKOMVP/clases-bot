// PASO 3: Agregar ruta API simple
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [apiResult, setApiResult] = useState<string>('');
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold">
                Clases Bot
              </Link>
              <Link href="/usuarios" className="hover:text-purple-200 transition-colors">
                Alumnos
              </Link>
              <Link href="/clases" className="hover:text-purple-200 transition-colors">
                Clases
              </Link>
              <Link href="/reservas" className="hover:text-purple-200 transition-colors">
                Reservas
              </Link>
            </div>
            <div className="flex items-center">
              <span className="text-sm">Test Mode</span>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Test - API Route
        </h1>
        <p className="text-gray-600 mb-4">
          Si ves el navbar, los componentes client funcionan.
        </p>
        <button
          onClick={async () => {
            try {
              const res = await fetch('/api/test');
              const text = await res.text();
              setApiResult(`Status: ${res.status}\nResponse: ${text}`);
            } catch (error: any) {
              setApiResult('Error: ' + error.message);
            }
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 mb-4"
        >
          Test API Route (Text Plain)
        </button>
        {apiResult && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <pre className="text-sm">{apiResult}</pre>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-4">
          Timestamp: {new Date().toISOString()}
        </p>
      </div>
    </div>
  );
}

