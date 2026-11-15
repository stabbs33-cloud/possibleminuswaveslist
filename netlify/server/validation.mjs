import { levelNames, playerNames } from './catalog.mjs';
const reserved = [...Object.getOwnPropertyNames(Object.prototype), 'prototype'].map(n => n.toLowerCase());
function name(v, max = 100) { return typeof v === 'string' && v.trim() === v && v.length > 0 && v.length <= max && !reserved.includes(v.toLowerCase()); }
export function validDocument(key, value, extraLevels = []) {
  if (key === 'levels') {
    if (!Array.isArray(value?.items) || value.items.length > 2000) return false;
    const names = new Set(levelNames.map(n => n.toLowerCase()));
    return value.items.every(l => {
      if (!l || typeof l !== 'object' || !name(l.name) || names.has(l.name.toLowerCase()) || typeof l.points !== 'number' || !Number.isFinite(l.points) || l.points < 0 || l.points > 1000000) return false;
      names.add(l.name.toLowerCase());
      if (typeof l.id !== 'string' || !/^[0-9]{0,20}$/.test(l.id) || typeof l.verifier !== 'string' || l.verifier.length > 100 || typeof l.url !== 'string' || l.url.length > 2000) return false;
      if (l.url) { try { if (!['https:', 'http:'].includes(new URL(l.url).protocol)) return false; } catch { return false; } }
      return true;
    });
  }
  if (key === 'mods') return Array.isArray(value?.names) && value.names.length <= 200 && value.names.every(n => name(n)) && new Set(value.names).size === value.names.length;
  if (key === 'completions') {
    if (!value?.map || typeof value.map !== 'object' || Array.isArray(value.map)) return false;
    const known = new Set([...levelNames, ...extraLevels]);
    return Object.entries(value.map).every(([p, records]) => playerNames.includes(p) && Array.isArray(records) && records.length <= 3000 && new Set(records).size === records.length && records.every(n => known.has(n)));
  }
  return false;
}
