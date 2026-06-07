import 'server-only';

import { Meilisearch } from 'meilisearch';
export type { Meilisearch } from 'meilisearch';

const host = process.env.MEILISEARCH_HOST;
const apiKey = process.env.MEILISEARCH_KEY;
export const MEILISEARCH_INDEX = process.env.MEILISEARCH_INDEX || 'docs';


if (!host) {
  throw new Error('Missing MEILISEARCH_HOST environment variable');
}

if (!apiKey) {
  throw new Error('Missing MEILISEARCH_KEY environment variable');
}

export const meiliClient = new Meilisearch({
  host,
  apiKey,
});
