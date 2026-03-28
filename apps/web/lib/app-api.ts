import type { SchedulerCapability } from "@/lib/domain";
import { getApiBaseUrl } from "@/lib/env";

export async function fetchSchedulerCapabilities() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/scheduler/capabilities`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SchedulerCapability | null;
  } catch {
    return null;
  }
}
