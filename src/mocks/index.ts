// MOCKS (Walid) — point d'entrée. Seuls les stubs de §7 (src/sim, src/models, src/ingest, src/content)
// importent d'ici ; les pages passent par ces modules, jamais par src/mocks (sauf mission.ts).
export * from './mission';
export * from './curves';
export * from './body';
export * from './blood';
export * from './watch';
export * from './checkin';
export * from './bioAge';
export * from './alerts';
export * from './plan';
export * from './content';
export * from './ingest';
