import type { LangId } from '../../lang';
import type { LangRef } from '../types';

const LOADERS: Record<LangId, () => Promise<LangRef>> = {
  la: () => import('./la').then((m) => m.ref),
  de: () => import('./de').then((m) => m.ref),
  es: () => import('./es').then((m) => m.ref),
  fr: () => import('./fr').then((m) => m.ref),
};

export const loadRef = (id: LangId): Promise<LangRef> => LOADERS[id]();
