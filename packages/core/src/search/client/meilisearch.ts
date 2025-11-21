import type { MeiliSearch } from 'meilisearch';
import { createContentHighlighter, type SortedResult } from '@/search';

export interface MeilisearchOptions {
  indexUid: string;
  client: MeiliSearch;
  tag?: string;
  tagField?: string;
}

export async function searchDocs(
  query: string,
  { indexUid, client, tag, tagField }: MeilisearchOptions,
): Promise<SortedResult[]> {
  if (!query.trim()) return [];

  const index = client.index(indexUid);

  let filter: string | undefined;
  if (tag && tagField) {
    filter = `${tagField} = "${tag}"`;
  }

  const response = await index.search(query, {
    filter,
  });

  const highlighter = createContentHighlighter(query);

  const hits = response.hits ?? [];

  return hits.map<SortedResult>((hit) => {
    const baseContent = hit.title || hit.content || hit.url || '';

    return {
      id: hit.id,
      type: 'page',
      url: hit.url,
      content: baseContent,
      contentWithHighlights: highlighter.highlight(
        hit.content ?? hit.title ?? '',
      ),
    };
  });
}
