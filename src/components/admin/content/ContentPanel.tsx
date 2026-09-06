import { useState } from "react";
import { ContentOverview } from "./ContentOverview";
import { ContentFilters } from "./ContentFilters";
import { ContentTable } from "./ContentTable";
import { ContentDetailDrawer } from "./ContentDetailDrawer";
import {
  emptyContentFilters,
  useContentFacets,
  useContentItems,
  useContentStats,
  type ContentFilterState,
} from "@/hooks/useContent";

export function ContentPanel() {
  const [filters, setFilters] = useState<ContentFilterState>(emptyContentFilters);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const stats = useContentStats();
  const facets = useContentFacets();
  const list = useContentItems(filters, page);

  const onFilters = (next: ContentFilterState) => {
    setFilters(next);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <ContentOverview
        stats={stats.data}
        loading={stats.isLoading}
        error={stats.error as Error | null}
        onRetry={() => void stats.refetch()}
      />

      <ContentFilters value={filters} onChange={onFilters} facets={facets.data} />

      <ContentTable
        rows={list.data?.rows ?? []}
        count={list.data?.count ?? 0}
        page={page}
        onPage={setPage}
        loading={list.isLoading}
        fetching={list.isFetching}
        error={list.error as Error | null}
        onRetry={() => void list.refetch()}
        onOpen={setOpenId}
      />

      <ContentDetailDrawer contentId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
