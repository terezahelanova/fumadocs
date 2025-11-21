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
  TagsList,
  TagsListItem,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { MeiliSearch } from 'meilisearch';
import { useEffect, useState } from 'react';

// Replace with your Meilisearch configuration
const apiKey = 'devkey';
const host = 'http://127.0.0.1:7700';
const tagForFilter = 'scope';
const index = 'docs';

const client = new MeiliSearch({
  apiKey,
  host,
});

export default function CustomSearchDialog(props: SharedProps) {
  const [activeFilter, setActiveFilter] = useState<string | undefined>(
    undefined,
  );
  const [filterOptions, setFilterOptions] = useState<string[]>([]);

  const { search, setSearch, query } = useDocsSearch({
    type: 'meilisearch',
    indexUid: index,
    client,
    tag: activeFilter,
    tagField: tagForFilter,
  });

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

        if (finishRequest) {
          setFilterOptions(availableFilters);
        }
      } catch (error) {
        console.error(
          `Failed to load available filters from Meilisearch for '${tagForFilter}':`,
          error,
        );

        if (finishRequest) {
          setFilterOptions([]);
        }
      }
    })();

    return () => {
      finishRequest = false;
    };
  }, [props.open]);

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

        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />

        <SearchDialogFooter className="flex flex-row gap-2">
          <TagsList
            tag={activeFilter ?? ''}
            onTagChange={(value) => setActiveFilter(value || undefined)}
          >
            <TagsListItem value="">All</TagsListItem>

            {filterOptions.map((value) => (
              <TagsListItem key={value} value={value}>
                {value}
              </TagsListItem>
            ))}
          </TagsList>
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
