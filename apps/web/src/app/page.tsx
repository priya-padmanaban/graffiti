"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to default room
    router.push("/r/global");
  }, [router]);

  return null;
}
