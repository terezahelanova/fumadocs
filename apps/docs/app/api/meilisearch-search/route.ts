import { createMeilisearchAPI } from 'fumadocs-core/search/meilisearch';
import { meiliClient, MEILISEARCH_INDEX } from '@/lib/meilisearch/meilisearch';

export async function GET(request: Request) {
  const url = new URL(request.url);

  const filterAttribute = url.searchParams.get('filterAttribute') ?? undefined;
  const filterAttributeValue = url.searchParams.get('filterAttributeValue') ?? undefined;

  const searchAPI = createMeilisearchAPI({
    indexUid: MEILISEARCH_INDEX,
    client: meiliClient,
    filterAttribute: filterAttribute,
    filterAttributeValue: filterAttributeValue,
  });
  return searchAPI.GET(request);
}
