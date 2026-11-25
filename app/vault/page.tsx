import { Suspense } from "react";
import { VaultClient } from "./vault-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function VaultPage() {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full" />}>
      <VaultClient />
    </Suspense>
  );
}
