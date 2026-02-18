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
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { MeiliSearch } from 'meilisearch';
import { useEffect, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'fumadocs-ui/components/ui/popover';
import { cn } from '@/lib/cn';
import { buttonVariants } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useDocsSearch } from 'fumadocs-core/search/client';

// Replace with your Meilisearch configuration
const apiKey = 'devkey';
const host = 'http://127.0.0.1:7700';
const tagForFilter = 'scope';
const index = 'docs';

const client = new MeiliSearch({
  apiKey: apiKey,
  host: host,
});

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

  console.log(query.data);
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
          items={query.data !== 'empty' ? query.data : null}
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

