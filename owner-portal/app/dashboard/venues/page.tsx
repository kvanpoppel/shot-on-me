import { Suspense } from "react";
import VenuesContent from "./VenuesContent";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <VenuesContent />
    </Suspense>
  );
}
