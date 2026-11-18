import { redirect } from "next/navigation";

export default function QualityReportsRedirectPage() {
  redirect("/reports/test-coverage");
}
