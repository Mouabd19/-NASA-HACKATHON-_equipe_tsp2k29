// Propriétaire : Ahmed (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature.
// Pour l'instant : simple délégation vers src/mocks/ (données factices). Supprime le corps et code le vrai module.
import type { Measurement } from '../types';
import { mockParseHealthExport } from '../mocks';

export function parseHealthExport(file: File, onProgress?: (pct: number) => void): Promise<Measurement[]> {
  return mockParseHealthExport(file, onProgress);
}
