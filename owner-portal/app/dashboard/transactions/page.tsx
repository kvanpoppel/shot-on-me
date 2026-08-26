import { Suspense } from "react";
import TransactionsContent from "./TransactionsContent";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
