import { Suspense } from "react";
import { NotesClient } from "./notes-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function NotesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full" />}>
      <NotesClient />
    </Suspense>
  );
}
