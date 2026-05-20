import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAppInitialized } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await isAppInitialized())) {
    redirect("/setup");
  }
  const session = (await cookies()).get("erp_session")?.value;
  redirect(session ? "/dashboard" : "/login");
}
