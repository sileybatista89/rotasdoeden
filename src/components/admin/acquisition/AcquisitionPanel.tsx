import { useState } from "react";
import { AcquisitionDetailDrawer } from "./AcquisitionDetailDrawer";
import { AcquisitionFilters } from "./AcquisitionFilters";
import { AcquisitionOverview } from "./AcquisitionOverview";
import { AcquisitionTable } from "./AcquisitionTable";
import {
  emptyAcquisitionFilters,
  useAcquisitionFacets,
  useAcquisitionPlans,
  type AcquisitionFilterState,
} from "@/hooks/useAcquisition";

export function AcquisitionPanel() {
  const [filters, setFilters] = useState<AcquisitionFilterState>(emptyAcquisitionFilters);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const plans = useAcquisitionPlans(filters, page);
  const facets = useAcquisitionFacets();

  const onFilters = (next: AcquisitionFilterState) => {
    setFilters(next);
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <AcquisitionOverview />
      <AcquisitionFilters value={filters} onChange={onFilters} facets={facets.data} />
      <AcquisitionTable
        rows={plans.data?.rows ?? []}
        count={plans.data?.count ?? 0}
        page={page}
        onPage={setPage}
        loading={plans.isLoading}
        fetching={plans.isFetching}
        error={(plans.error as Error) ?? null}
        onRetry={() => plans.refetch()}
        onOpen={setOpenId}
      />
      <AcquisitionDetailDrawer planId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
