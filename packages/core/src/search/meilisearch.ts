import { type SortedResult, createContentHighlighter } from '@/search';
import { createEndpoint } from '@/search/server/endpoint';
import type { SearchAPI, QueryOptions } from '@/search/server/types';
import { codeToHtml } from 'shiki';
import { transformerNotationWordHighlight } from '@shikijs/transformers';

export interface MeilisearchOptions {
  /**
   * The identifier of the Meilisearch index to search in.
   */
  indexUid: string;
  /**
   * The Meilisearch client instance.
   */
  client: any;
  /**
   * Attribute name used for filtering.
   */
  filterAttribute?: string;
  /**
   * Concrete value of 'filterAttribute' to filter results by.
   */
  filterAttributeValue?: string;
}

type FacetHit = {
  value: string;
  count: number;
};

/**
 * Meilisearch documents are expected to contain:
 * - url: Page path including anchor (e.g., "/guide#installation")
 * - heading: The heading text for the search result
 * - pageTitle: The title of the page
 * - rawContent: Text with the search result in a Markdown format
 * - content: Plain text with the search result
 */

type SearchHit = {
  url: string;
  heading: string;
  pageTitle: string;
  rawContent: string;
  content: string;
};

type ParsedCodeBlock = {
  lang: string;
  code: string;
};

export function createMeilisearchAPI(options: MeilisearchOptions): SearchAPI<QueryOptions> {
  const { indexUid, client, filterAttribute, filterAttributeValue } = options;

  return createEndpoint({
    async search(query) {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        return [];
      }

      const index = client.index(indexUid);

      const response = await index.search(trimmedQuery, {
        filter: createFilter(filterAttribute, filterAttributeValue),
      });

      return mapHitsToSortedResults(response.hits as SearchHit[], trimmedQuery);
    },

    async export() {
      throw new Error('Export is not implemented.');
    },
  });
}

function createFilter(filterAttribute?: string, filterAttributeValue?: string): string | undefined {
  if (!filterAttribute || !filterAttributeValue) {
    return undefined;
  }

  return `${filterAttribute} = "${filterAttributeValue}"`;
}

async function mapHitsToSortedResults(hits: SearchHit[], query: string): Promise<SortedResult[]> {
  const highlighter = createContentHighlighter(query);

  const pages = new Map<string, SortedResult>();
  const pageItems = new Map<string, SortedResult[]>();

  let idCounter = 0;

  for (const hit of hits) {
    const pageId = hit.url;

    if (!pages.has(pageId)) {
      pages.set(pageId, createPageResult(hit, highlighter));
      pageItems.set(pageId, []);
    }

    const content = await highlightHitContent(hit.rawContent, query, highlighter);

    pageItems.get(pageId)?.push({
      id: `${pageId}-${idCounter++}`,
      type: 'text',
      content,
      url: hit.url,
    });
  }

  return flattenGroupedResults(pages, pageItems);
}

function createPageResult(
  hit: SearchHit,
  highlighter: ReturnType<typeof createContentHighlighter>,
): SortedResult {
  return {
    id: hit.url,
    type: 'page',
    content: highlighter.highlightMarkdown(hit.heading),
    breadcrumbs: [hit.pageTitle],
    url: hit.url,
  };
}

async function highlightHitContent(
  content: string,
  query: string,
  highlighter: ReturnType<typeof createContentHighlighter>,
): Promise<string> {
  const codeBlock = parseCodeBlock(content);

  if (!codeBlock) {
    return highlighter.highlightMarkdown(content);
  }

  return highlightCodeBlock(codeBlock, query);
}

function parseCodeBlock(content: string): ParsedCodeBlock | null {
  const trimmedContent = content.trim();

  const match = trimmedContent.match(/^```([^\s`]*)[^\n]*\n([\s\S]*?)\n```$/);

  if (!match) {
    return null;
  }

  return {
    lang: match[1] || 'text',
    code: match[2],
  };
}

async function highlightCodeBlock(codeBlock: ParsedCodeBlock, query: string): Promise<string> {
  const modifiedCode = addWordHighlightNotation(codeBlock.code, query);

  return codeToHtml(modifiedCode, {
    lang: codeBlock.lang,
    theme: 'slack-dark',
    transformers: [transformerNotationWordHighlight({})],
  });
}

function addWordHighlightNotation(code: string, query: string): string {
  const lines = code.split('\n');
  const result = [];

  for (let i = 1; i < lines.length - 1; i++) {
    result.push(`// [!code word:${query}]`);
    result.push(lines[i]);
  }

  return result.join('\n');
}

function flattenGroupedResults(
  pages: Map<string, SortedResult>,
  pageItems: Map<string, SortedResult[]>,
): SortedResult[] {
  const results: SortedResult[] = [];

  for (const [pageId, page] of pages) {
    results.push(page);
    results.push(...(pageItems.get(pageId) ?? []));
  }

  return results;
}

export async function fetchFilters(options: MeilisearchOptions): Promise<string[]> {
  const { indexUid, client, filterAttribute } = options;

  if (!filterAttribute) {
    return [];
  }

  try {
    const index = client.index(indexUid);

    const facetResponse = await index.searchForFacetValues({
      facetName: filterAttribute,
      facetQuery: '',
    });

    return facetResponse.facetHits.map((hit: FacetHit) => hit.value);
  } catch (error) {
    console.error(
      `Failed to fetch facet values for '${filterAttribute}' from index '${indexUid}':`,
      error,
    );

    return [];
  }
}
