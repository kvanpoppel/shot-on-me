import { Suspense } from "react";
import AnalyticsContent from "./AnalyticsContent";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
