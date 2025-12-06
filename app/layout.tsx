import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Clases Bot - Gestión de Yoga',
  description: 'Sistema de gestión de clases y alumnos de yoga',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

