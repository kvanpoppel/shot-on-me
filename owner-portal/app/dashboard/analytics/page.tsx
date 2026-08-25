import { Suspense } from "react";
import AnalyticsContent from "./AnalyticsContent";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
