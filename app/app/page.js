export const dynamic = "force-dynamic";

import { Suspense } from "react";
import AppPageClient from "./AppPageClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppPageClient />
    </Suspense>
  );
}
