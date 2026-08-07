export interface Category {
  id: string
  name: string
  icon: string
}

export const COMMON_CATEGORIES: Category[] = [
  { id: 'comida', name: 'Comida', icon: '🍽️' },
  { id: 'transporte', name: 'Transporte', icon: '🚗' },
  { id: 'entretenimiento', name: 'Ocio', icon: '🎬' },
  { id: 'servicios', name: 'Servicios', icon: '💡' },
  { id: 'salud', name: 'Salud', icon: '⚕️' },
  { id: 'compras', name: 'Compras', icon: '🛍️' },
  { id: 'ropa', name: 'Ropa', icon: '👕' },
  { id: 'hogar', name: 'Hogar', icon: '🏠' },
  { id: 'musica_banda', name: 'Musica/Banda', icon: '🎸' },
  { id: 'innecesario', name: 'Innecesario', icon: '🐜' },
  { id: 'otros', name: 'Otros', icon: '📦' },
]

export const CATEGORY_ALIASES: Record<string, string> = {
  cafe: 'comida',
  restaurante: 'comida',
  supermercado: 'comida',
  uber: 'transporte',
  taxi: 'transporte',
  nafta: 'transporte',
  colectivo: 'transporte',
  subte: 'transporte',
  cine: 'entretenimiento',
  juegos: 'entretenimiento',
  luz: 'servicios',
  gas: 'servicios',
  internet: 'servicios',
  telefono: 'servicios',
  farmacia: 'salud',
  medico: 'salud',
  ropa: 'ropa',
  zapatillas: 'ropa',
  alquiler: 'hogar',
  muebles: 'hogar',
}
