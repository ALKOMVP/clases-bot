import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/usuarios" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Alumnos</h2>
            <p className="text-gray-600">Gestiona tus alumnos registrados</p>
          </Link>
          
          <Link href="/clases" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Clases</h2>
            <p className="text-gray-600">Ver y gestionar horarios de clases</p>
          </Link>
          
          <Link href="/reservas" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Reservas</h2>
            <p className="text-gray-600">Inscripciones de alumnos a clases</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

