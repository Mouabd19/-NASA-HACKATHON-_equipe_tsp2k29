import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { parseHealthBlob, parseHealthXmlChunks, toIso } from '../../src/ingest/healthExport';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [
<!ATTLIST Record
  type          CDATA #REQUIRED
>
]>
<HealthData locale="fr_FR">
 <ExportDate value="2026-11-14 15:50:07 +0100"/>
 <Record type="HKQuantityTypeIdentifierRestingHeartRate" sourceName="Apple Watch" unit="count/min" creationDate="2026-10-15 08:00:00 +0100" startDate="2026-10-14 06:00:00 +0100" endDate="2026-10-14 22:00:00 +0100" value="58"/>
 <Record type="HKQuantityTypeIdentifierVO2Max" sourceName="Apple Watch" unit="mL/min·kg" startDate="2025-05-28 21:37:52 +0100" endDate="2025-05-28 21:37:52 +0100" value="38.29">
  <MetadataEntry key="HKVO2MaxTestType" value="2"/>
 </Record>
 <Record type="HKQuantityTypeIdentifierOxygenSaturation" sourceName="Apple Watch" unit="%" startDate="2026-11-13 07:00:00 +0100" endDate="2026-11-13 07:00:00 +0100" value="0.97"/>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2026-11-13 07:00:00 +0100" endDate="2026-11-13 07:10:00 +0100" value="120"/>
 <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" device="&lt;&lt;HKDevice: 0x1&gt;, name:Apple Watch&gt;" unit="ms" startDate="2026-11-13 03:00:00 +0100" endDate="2026-11-13 03:01:00 +0100" value="42.5">
  <HeartRateVariabilityMetadataList>
   <InstantaneousBeatsPerMinute bpm="60" time="3:00:01,00 AM"/>
  </HeartRateVariabilityMetadataList>
 </Record>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Apple Watch" startDate="2026-11-12 23:00:00 +0100" endDate="2026-11-13 07:00:00 +0100" value="HKCategoryValueSleepAnalysisInBed"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Apple Watch" startDate="2026-11-12 23:30:00 +0100" endDate="2026-11-13 02:00:00 +0100" value="HKCategoryValueSleepAnalysisAsleepCore"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Apple Watch" startDate="2026-11-13 02:00:00 +0100" endDate="2026-11-13 02:30:00 +0100" value="HKCategoryValueSleepAnalysisAwake"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Apple Watch" startDate="2026-11-13 02:30:00 +0100" endDate="2026-11-13 06:30:00 +0100" value="HKCategoryValueSleepAnalysisAsleepDeep"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="iPhone" startDate="2026-11-13 05:30:00 +0100" endDate="2026-11-13 06:45:00 +0100" value="HKCategoryValueSleepAnalysisAsleepUnspecified"/>
 <Record type="HKQuantityTypeIdentifierHeartRate" unit="count/min" startDate="2026-09-01 10:00:00 +0100" endDate="2026-09-01 10:00:00 +0100" value="90"/>
 <Record type="HKQuantityTypeIdentifierHeartRate" unit="count/min" startDate="2026-11-13 10:00:00 +0100" endDate="2026-11-13 10:00:00 +0100" value="72"/>
 <Record type="HKQuantityTypeIdentifierHeartRate" unit="count/min" startDate="2026-11-01 10:00:00 +0100" endDate="2026-11-01 10:00:00 +0100" value="75"/>
</HealthData>
`;

function chunk(s: string, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out;
}

describe('toIso', () => {
  it('convertit le format Apple en ISO avec fuseau', () => {
    expect(toIso('2025-05-20 17:53:19 +0100')).toBe('2025-05-20T17:53:19+01:00');
    expect(toIso('2025-05-20 17:53:19 -0530')).toBe('2025-05-20T17:53:19-05:30');
  });
});

describe('parseHealthXmlChunks', () => {
  it('ne dépend pas du découpage en morceaux (7 octets, 1 octet, un seul bloc)', async () => {
    const whole = await parseHealthXmlChunks([XML]);
    expect(await parseHealthXmlChunks(chunk(XML, 7))).toEqual(whole);
    expect(await parseHealthXmlChunks(chunk(XML, 1))).toEqual(whole);
    expect(await parseHealthXmlChunks(chunk(XML, 113))).toEqual(whole);
  });

  it('extrait les types utiles et ignore le reste', async () => {
    const ms = await parseHealthXmlChunks(chunk(XML, 7));
    const types = new Set(ms.map((m) => m.type));
    expect(types).toEqual(new Set(['RestingHeartRate', 'VO2Max', 'OxygenSaturation', 'HeartRateVariabilitySDNN', 'SleepAnalysis', 'HeartRate']));
    expect(ms.every((m) => m.source === 'apple-watch-export')).toBe(true);
    const rhr = ms.find((m) => m.type === 'RestingHeartRate')!;
    expect(rhr).toMatchObject({ value: 58, unit: 'bpm', date: '2026-10-14T22:00:00+01:00' });
    expect(ms.find((m) => m.type === 'VO2Max')).toMatchObject({ value: 38.29, unit: 'mL/kg/min' });
    expect(ms.find((m) => m.type === 'HeartRateVariabilitySDNN')!.value).toBe(42.5);
  });

  it('convertit la SpO₂ de fraction en %', async () => {
    const ms = await parseHealthXmlChunks([XML]);
    expect(ms.find((m) => m.type === 'OxygenSaturation')).toMatchObject({ value: 97, unit: '%' });
  });

  it('agrège le sommeil par nuit : segments Asleep*, sans InBed ni Awake, union des sources', async () => {
    const ms = await parseHealthXmlChunks([XML]);
    const sleep = ms.filter((m) => m.type === 'SleepAnalysis');
    expect(sleep).toHaveLength(1);
    // 23:30→02:00 (2,5 h) + 02:30→06:45 (4,25 h, chevauchement iPhone fusionné) = 6,75 h
    expect(sleep[0]).toMatchObject({ value: 6.75, unit: 'h', date: '2026-11-13T06:45:00+01:00' });
  });

  it('ne garde la FC brute que sur les 30 derniers jours', async () => {
    const ms = await parseHealthXmlChunks([XML]);
    const hr = ms.filter((m) => m.type === 'HeartRate').map((m) => m.value);
    expect(hr.sort()).toEqual([72, 75]);
  });

  it('trie par date', async () => {
    const ms = await parseHealthXmlChunks([XML]);
    const t = ms.map((m) => Date.parse(m.date));
    expect([...t].sort((a, b) => a - b)).toEqual(t);
  });

  it('flux vide → aucune mesure', async () => {
    expect(await parseHealthXmlChunks([])).toEqual([]);
  });
});

/** Construit un ZIP minimal (une entrée deflate) pour tester la lecture d'export.zip. */
function makeZip(name: string, content: string): Uint8Array<ArrayBuffer> {
  const data = Buffer.from(content, 'utf8');
  const comp = deflateRawSync(data);
  const nameB = Buffer.from(name);
  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
  lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nameB.length, 26);
  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(8, 10);
  cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(nameB.length, 28);
  cd.writeUInt32LE(0, 42);
  const cdOff = lh.length + nameB.length + comp.length;
  const cdLen = cd.length + nameB.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdLen, 12); eocd.writeUInt32LE(cdOff, 16);
  return new Uint8Array(Buffer.concat([lh, nameB, comp, cd, nameB, eocd])) as Uint8Array<ArrayBuffer>;
}

describe('parseHealthBlob', () => {
  it('lit export.xml directement, avec progression jusqu\'à 100', async () => {
    const pcts: number[] = [];
    const ms = await parseHealthBlob(new Blob([XML]), (p) => pcts.push(p));
    expect(ms.length).toBeGreaterThan(0);
    expect(pcts.at(-1)).toBe(100);
  });

  it('lit export.zip (apple_health_export/export.xml) comme le XML brut', async () => {
    const zip = makeZip('apple_health_export/export.xml', XML);
    const fromZip = await parseHealthBlob(new Blob([zip]));
    const fromXml = await parseHealthXmlChunks([XML]);
    expect(fromZip).toEqual(fromXml);
  });
});
