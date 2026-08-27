import { Suspense } from "react";
import SetPasswordContent from "./SetPasswordContent";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <SetPasswordContent />
    </Suspense>
  );
}
