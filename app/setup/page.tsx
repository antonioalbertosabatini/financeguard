"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SetupFlow } from "@/components/auth/setup-flow";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { useDataStore } from "@/lib/storage/data-store";

export default function SetupPage() {
  const { status } = useDataStore();
  const router = useRouter();

  useEffect(() => {
    if (status === "unlocked") router.replace("/");
    else if (status === "locked") router.replace("/unlock");
  }, [status, router]);

  if (status !== "needs-setup") return <FullScreenLoader />;

  return <SetupFlow />;
}
