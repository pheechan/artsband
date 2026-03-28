"use client";

import { useMemo, useState } from "react";
import { addDays, format, setHours, setMinutes } from "date-fns";

import { Button, Card } from "@/components/primitives";

const HOURS = Array.from({ length: 12 }, (_, index) => index + 9);

type SlotState = "certain" | "uncertain" | null;

interface SlotItem {
  id?: string;
  start_time: string;
  status: "certain" | "uncertain";
}

function toSlotKey(date: Date, hour: number) {
  return `${format(date, "yyyy-MM-dd")}|${hour}`;
}

export function AvailabilityGrid({
  weekStart,
  initialSlots,
}: {
  weekStart: string;
  initialSlots: SlotItem[];
}) {
  const [slots, setSlots] = useState<Record<string, SlotState>>(() => {
    const mapped: Record<string, SlotState> = {};
    initialSlots.forEach((slot) => {
      const start = new Date(slot.start_time);
      mapped[toSlotKey(start, start.getHours())] = slot.status;
    });
    return mapped;
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startDate = useMemo(() => new Date(`${weekStart}T00:00:00`), [weekStart]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startDate, index)), [startDate]);

  const certainCount = Object.values(slots).filter((slot) => slot === "certain").length;
  const uncertainCount = Object.values(slots).filter((slot) => slot === "uncertain").length;

  const toggleSlot = (date: Date, hour: number) => {
    const key = toSlotKey(date, hour);
    setSlots((previous) => {
      const current = previous[key] ?? null;
      const next: SlotState = current === null ? "certain" : current === "certain" ? "uncertain" : null;
      const updated = { ...previous };
      if (!next) {
        delete updated[key];
      } else {
        updated[key] = next;
      }
      return updated;
    });
  };

  const clearAll = () => {
    setSlots({});
    setStatusMessage(null);
  };

  const saveAvailability = async () => {
    setSaving(true);
    setStatusMessage(null);

    const payload = Object.entries(slots).flatMap(([key, status]) => {
      if (!status) {
        return [];
      }

      const [datePart, hourPart] = key.split("|");
      const date = setMinutes(setHours(new Date(`${datePart}T00:00:00`), Number(hourPart)), 0);
      return [{ start_time: date.toISOString(), status }];
    });

    const response = await fetch("/api/member/availability", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        weekStart,
        slots: payload,
      }),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setStatusMessage(result?.error || "We could not save your availability.");
      setSaving(false);
      return;
    }

    setStatusMessage(result?.message || "Availability saved.");
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-primary" />
              Certain ({certainCount})
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 rounded border-2 border-primary bg-accent" />
              Uncertain ({uncertainCount})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={clearAll}>
              Clear week
            </Button>
            <Button onClick={saveAvailability} disabled={saving}>
              {saving ? "Saving..." : "Save availability"}
            </Button>
          </div>
        </div>
        {statusMessage ? <p className="mt-4 text-sm text-muted-foreground">{statusMessage}</p> : null}
      </Card>

      <Card className="overflow-x-auto p-5">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-8 gap-2">
            <div className="px-2 py-3 text-sm font-semibold text-muted-foreground">Time</div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="px-2 py-3 text-center text-sm font-semibold">
                <div>{format(day, "EEE")}</div>
                <div className="text-muted-foreground">{format(day, "d MMM")}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-2">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 gap-2">
                <div className="flex items-center px-2 text-sm text-muted-foreground">
                  {format(setHours(new Date(), hour), "h a")}
                </div>
                {weekDays.map((day) => {
                  const status = slots[toSlotKey(day, hour)] ?? null;
                  return (
                    <button
                      key={`${day.toISOString()}-${hour}`}
                      type="button"
                      onClick={() => toggleSlot(day, hour)}
                      className={
                        status === "certain"
                          ? "h-11 rounded-xl bg-primary text-primary-foreground"
                          : status === "uncertain"
                            ? "h-11 rounded-xl border-2 border-primary bg-accent text-accent-foreground"
                            : "h-11 rounded-xl border border-border bg-secondary hover:bg-secondary/80"
                      }
                    >
                      <span className="sr-only">{format(day, "PPP")} {hour}:00</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
