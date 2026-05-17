const CALLSIGNS = [
  'GHOST',
  'PHOENIX',
  'RAVEN',
  'VIPER',
  'APEX',
  'ECHO',
  'NOMAD',
  'SPECTRE',
  'RAPTOR',
  'TITAN',
  'ORION',
  'ATLAS',
  'BRAVO',
  'KILO',
  'OMEGA',
  'HUNTER',
] as const;

export function codename(parentUuid: string): string {
  let h = 5381;
  for (let i = 0; i < parentUuid.length; i++) {
    h = (h * 33) ^ parentUuid.charCodeAt(i);
  }
  const idx = (h >>> 0) % CALLSIGNS.length;
  const word = CALLSIGNS[idx] ?? 'GHOST';
  const num = ((h >>> 0) % 99) + 1;
  return `${word}-${num.toString().padStart(2, '0')}`;
}

export function missionCode(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  const num = ((h >>> 0) % 900) + 100;
  return `OP-${num}`;
}
