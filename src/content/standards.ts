// Propriétaire : Steve (D). Normes NASA-STD-3001 Vol. 1 Rev C — ROADMAP §7.
// Données : public/data/nasa/standards.json (citations relues, `verified`). Aucun appel réseau.
import data from '../../public/data/nasa/standards.json';

export interface Standard { id: string; title: string; quote: string; url: string; verified: boolean }

const byId = new Map<string, Standard>(
  data.standards.map((s) => [s.id, { id: s.id, title: s.title, quote: s.quote, url: s.url, verified: s.verified }]),
);

/** Norme par identifiant (« V1 4027 »). Identifiant inconnu → entrée non vérifiée, jamais d'exception. */
export function getStandard(id: string): Standard {
  return byId.get(id) ?? { id, title: 'Unknown standard', quote: '', url: data.url, verified: false };
}
