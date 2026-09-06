import { useState } from "react";
import { DiscoveryOverview } from "./DiscoveryOverview";
import { DiscoveryFilters } from "./DiscoveryFilters";
import { DiscoveryTable } from "./DiscoveryTable";
import { DiscoveryDetailDrawer } from "./DiscoveryDetailDrawer";
import {
  emptyFilters,
  useDiscoveryFacets,
  useDiscoveryStats,
  useDiscoveryWeights,
  useOpportunities,
  type DiscoveryFilterState,
  type SortKey,
} from "@/hooks/useDiscovery";

export function DiscoveryPanel() {
  const [filters, setFilters] = useState<DiscoveryFilterState>(emptyFilters);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "opportunity_score", asc: false });
  const [openId, setOpenId] = useState<string | null>(null);

  const stats = useDiscoveryStats();
  const facets = useDiscoveryFacets();
  const weights = useDiscoveryWeights();
  const list = useOpportunities(filters, page, sort);

  const onFilters = (next: DiscoveryFilterState) => { setFilters(next); setPage(0); };
  const onSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: false }));
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <DiscoveryOverview
        stats={stats.data}
        loading={stats.isLoading}
        error={stats.error as Error | null}
        onRetry={() => void stats.refetch()}
      />

      <DiscoveryFilters value={filters} onChange={onFilters} facets={facets.data} />

      <DiscoveryTable
        rows={list.data?.rows ?? []}
        count={list.data?.count ?? 0}
        page={page}
        onPage={setPage}
        sort={sort}
        onSort={onSort}
        loading={list.isLoading}
        fetching={list.isFetching}
        error={list.error as Error | null}
        onRetry={() => void list.refetch()}
        onOpen={setOpenId}
      />

      <DiscoveryDetailDrawer
        opportunityId={openId}
        onClose={() => setOpenId(null)}
        configWeights={weights.data ?? null}
      />
    </div>
  );
}
