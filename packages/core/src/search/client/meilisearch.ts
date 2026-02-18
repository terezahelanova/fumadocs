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

  const headings = new Map<string, any>();
  const data = new Map<string, any[]>();
  let idCounter = 0;

  for (const hit of hits) {
    const id = hit.url;

    if (!headings.has(id)) {
      headings.set(id, {
        id: id,
        type: 'page',
        content: highlighter.highlightMarkdown(hit.heading),
        breadcrumbs: [hit.pageTitle],
        url: hit.url,
      });
      data.set(id, []);
    }

    data.get(id)?.push({
      id: `${id}-${idCounter++}`,
      content: highlighter.highlightMarkdown(hit.rawContent),
      type: 'text',
      url: hit.url,
    });
  }

  const result: SortedResult[] = [];

  headings.forEach((headingItem, id) => {
    result.push(headingItem);
    const textItems = data.get(id)!;
    result.push(...textItems);
  });

  return result;
}
