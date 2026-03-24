export const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile']

export function getDifficultyColor(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'facile': return 'bg-green-100 text-green-800'
    case 'moyen': return 'bg-yellow-100 text-yellow-800'
    case 'difficile': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}
