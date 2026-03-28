import { Badge } from "@/components/primitives";
import { cn } from "@/lib/utils";

export function FlashMessage({
  message,
  tone = "info",
}: {
  message?: string | null;
  tone?: "success" | "error" | "info";
}) {
  if (!message) {
    return null;
  }

  const toneClasses = {
    success: "border-green-200 bg-green-50 text-green-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-primary/15 bg-accent/70 text-accent-foreground",
  } as const;

  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm", toneClasses[tone])}>
      <Badge tone={tone === "success" ? "success" : tone === "error" ? "danger" : "brand"} className="mb-2">
        {tone === "success" ? "Success" : tone === "error" ? "Error" : "Update"}
      </Badge>
      <p>{message}</p>
    </div>
  );
}
