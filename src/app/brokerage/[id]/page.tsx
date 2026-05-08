import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Legacy route — all brokerage positions are now on /brokerage with tabs
export default async function BucketDetailPage() {
  redirect("/brokerage");
}
