'use client';

import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  SearchItemType,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { MeiliSearch } from 'meilisearch';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'fumadocs-ui/components/ui/popover';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { ChevronDown, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { HighlightedText } from 'fumadocs-core/search';

// Replace with your Meilisearch configuration
const apiKey = 'devkey';
const host = 'http://127.0.0.1:7700';
const tagForFilter = 'scope';
const index = 'docs';

const client = new MeiliSearch({
  apiKey: apiKey,
  host: host,
});

const contextCharacters = 40;

export default function MeilisearchSearchDialog(props: SharedProps) {
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>();
  const [filterOptions, setFilterOptions] = useState<string[]>(['all']);
  const { search, setSearch, query } = useDocsSearch({
    type: 'meilisearch',
    indexUid: index,
    client,
    tag: activeFilter,
    tagField: tagForFilter,
  });

  const router = useRouter();

  useEffect(() => {
    if (!props.open) return;

    let finishRequest = true;

    (async () => {
      try {
        const response = await client.index(index).search('', {
          facets: [tagForFilter],
        });

        const facetDistribution =
          response.facetDistribution?.[tagForFilter] ?? {};

        const availableFilters = Object.keys(facetDistribution);
        availableFilters.push('all');

        if (finishRequest) {
          setFilterOptions(availableFilters);
        }
      } catch (error) {
        console.error(
          `Failed to load available filters from Meilisearch for '${tagForFilter}':`,
          error,
        );

        if (finishRequest) {
          setFilterOptions(['all']);
        }
      }
    })();

    return () => {
      finishRequest = false;
    };
  }, [props.open]);

  const processedResults = useMemo<SearchItemType[]>(() => {
    if (!search || query.data === 'empty' || !query.data) return [];

    const pageGroupedResults = new Map<string, any[]>();
    query.data.forEach((hit: any) => {
      const pageTitle =
        hit.breadcrumbs && hit.breadcrumbs.length > 0 ? hit.breadcrumbs[0] : '';
      if (!pageGroupedResults.has(pageTitle)) {
        pageGroupedResults.set(pageTitle, []);
      }
      pageGroupedResults.get(pageTitle)?.push(hit);
    });

    const results: SearchItemType[] = [];
    let idCounter = 0;

    pageGroupedResults.forEach((hits, pageTitle) => {
      if (hits.length === 0) return;

      const rootSection = hits.find((hit) => hit.breadcrumbs.length < 2);

      results.push({
        id: `page-${idCounter++}`,
        type: 'action',
        node: (
          <div className="flex items-center gap-3 py-3 top-0 z-10">
            <FileText className="size-5 text-fd-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate text-base">
                {pageTitle}
              </div>
            </div>
          </div>
        ),
        onSelect: () => {
          router.push(rootSection.url);
        },
      });

      hits
        .filter((hit) => hit.breadcrumbs.length > 1)
        .forEach((hit) => {
          const subheading = hit.breadcrumbs[1];
          results.push({
            id: `heading-${idCounter++}`,
            type: 'action',
            node: (
              <div className="py-2.5">
                <div className="flex-1 min-w-0 ps-8">
                  <div className="font-medium text-fd-foreground truncate text-sm">
                    {subheading}
                  </div>
                </div>
              </div>
            ),
            onSelect: () => {
              router.push(hit.url);
            },
          });

          const sectionItems = processContentWithHighlights(
            hit.contentWithHighlights,
          );
          sectionItems.forEach((highlightItem) => {
            results.push({
              id: `hit-${idCounter++}`,
              type: 'action',
              node: <div className="ps-8">{highlightItem}</div>,
              onSelect: () => {
                router.push(hit.url);
              },
            });
          });
        });
    });

    return results;
  }, [query.data, search, router]);

  function processContentWithHighlights(
    highlights: HighlightedText<ReactNode>[],
  ): ReactNode[] {
    const items: ReactNode[] = [];

    let fullText = '';
    const highlightRanges: { start: number; end: number }[] = [];

    for (const node of highlights) {
      const nodeText = String(node.content);
      const start = fullText.length;
      fullText += nodeText;

      if (node.styles?.highlight) {
        highlightRanges.push({ start, end: start + nodeText.length });
      }
    }

    for (const { start, end } of highlightRanges) {
      const highlightText = fullText.slice(start, end);

      let contextStart = Math.max(0, start - contextCharacters);
      let contextEnd = Math.min(fullText.length, end + contextCharacters);

      if (contextStart > 0 && !/\s/.test(fullText[contextStart])) {
        while (contextStart > 0 && !/\s/.test(fullText[contextStart - 1])) {
          contextStart--;
        }
      }

      if (
        contextEnd < fullText.length &&
        !/\s/.test(fullText[contextEnd - 1])
      ) {
        while (
          contextEnd < fullText.length &&
          !/\s/.test(fullText[contextEnd])
        ) {
          contextEnd++;
        }
      }

      let beforeText = fullText.slice(contextStart, start);
      let afterText = fullText.slice(end, contextEnd);

      if (contextStart > 0) {
        beforeText = '...' + beforeText.replace(/^\s+/, '');
      }
      if (contextEnd < fullText.length) {
        afterText = afterText.replace(/\s+$/, '') + '...';
      }

      items.push(
        <div key={start} className="mb-2 last:mb-0">
          <span>{beforeText}</span>
          <span className="text-fd-primary underline">{highlightText}</span>
          <span>{afterText}</span>
        </div>,
      );
    }

    return items;
  }

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>

        <SearchDialogList
          items={processedResults.length > 0 ? processedResults : null}
        />

        <SearchDialogFooter className="flex flex-row gap-2">
          <Popover open={openFilterDialog} onOpenChange={setOpenFilterDialog}>
            <PopoverTrigger
              className={buttonVariants({
                size: 'sm',
                variant: 'secondary',
              })}
            >
              <span className="text-fd-muted-foreground/80 me-2">Filter</span>
              {activeFilter === ''
                ? 'all'
                : filterOptions.find((item) => item === activeFilter)}
              <ChevronDown className="size-3.5 text-fd-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent className="flex flex-col p-1 gap-1" align="start">
              {filterOptions.map((item, i) => {
                const isSelected = item === activeFilter;

                return (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveFilter(item === 'all' ? '' : item);
                      setOpenFilterDialog(false);
                    }}
                    className={cn(
                      'rounded-lg text-start px-2 py-1.5',
                      isSelected
                        ? 'text-fd-primary bg-fd-primary/10'
                        : 'hover:text-fd-accent-foreground hover:bg-fd-accent',
                    )}
                  >
                    <p className="font-medium mb-0.5">{item}</p>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
          <a
            href="https://meilisearch.com"
            rel="noreferrer noopener"
            className="ms-auto text-xs text-fd-muted-foreground"
          >
            Search powered by Meilisearch
          </a>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
