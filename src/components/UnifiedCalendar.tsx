"use client";

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import type { EventSourceFuncArg } from "@fullcalendar/core";

export function UnifiedCalendar() {
  const [loadError, setLoadError] = useState(false);

  async function fetchEvents(info: EventSourceFuncArg) {
    const params = new URLSearchParams({
      start: info.startStr,
      end: info.endStr,
    });
    const res = await fetch(`/api/events?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to load events: ${res.status}`);
    return res.json();
  }

  return (
    <div className="cal-panel stack">
      {loadError && (
        <p className="error" style={{ margin: 0 }}>
          Couldn&apos;t load your events right now. Try refreshing the page.
        </p>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        height="auto"
        editable={false}
        selectable={false}
        events={fetchEvents}
        eventSourceFailure={() => setLoadError(true)}
        loading={(isLoading) => {
          if (isLoading) setLoadError(false);
        }}
        eventDidMount={(info) => {
          const location = info.event.extendedProps.location as
            | string
            | null
            | undefined;
          const sourceLabel = info.event.extendedProps.sourceLabel as
            | string
            | undefined;
          const bits = [sourceLabel, location].filter(Boolean);
          if (bits.length) {
            info.el.title = bits.join(" · ");
          }
        }}
      />
    </div>
  );
}
