import { SortedResult } from '..';
import type { SearchClient } from '../client';

export interface MeilisearchClientOptions {
  /**
   * Attribute name used for filtering.
   */
  filterAttribute?: string;
  /**
   * Concrete value of 'filterAttribute' to filter results by.
   */
  filterAttributeValue?: string;
}

export interface MeilisearchFilterOptions {
  /**
   * Attribute name used for filtering.
   */
  filterAttribute: string;
}

export function meilisearchClient({
  filterAttribute,
  filterAttributeValue,
}: MeilisearchClientOptions): SearchClient {
  const api = '/api/meilisearch-search';

  return {
    async search(query) {
      const url = new URL(api, window.location.origin);
      url.searchParams.set('query', query);
      if (filterAttribute) url.searchParams.set('filterAttribute', filterAttribute);
      if (filterAttributeValue) url.searchParams.set('filterAttributeValue', filterAttributeValue);

      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const result = (await res.json()) as SortedResult[];
      return result;
    },
  };
}

export async function meilisearchFilters({
  filterAttribute,
}: MeilisearchFilterOptions): Promise<string[]> {
  const api = '/api/meilisearch-filters';
  const url = new URL(api, window.location.origin);

  if (filterAttribute) url.searchParams.set('filterAttribute', filterAttribute);
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  const result = (await res.json()) as string[];

  return result;
}
