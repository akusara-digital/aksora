"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/toast";

type AssignmentEvent = {
  type: "task_assigned" | "bug_assigned";
  id: number;
  title: string;
  priority: string;
  workspace: string;
  href: string;
  message: string;
};

// Listens to /api/notifications/stream SSE and toasts when a new assignment arrives.
const INITIAL_RECONNECT_MS = 30_000;
const MAX_RECONNECT_MS = 300_000;
const MAX_IDLE_RECONNECTS = 6;

export function useAssignmentNotifications(enabled = true) {
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    function connect() {
      if (typeof document !== "undefined" && document.hidden) return;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      const es = new EventSource("/api/notifications/stream");
      esRef.current = es;

      es.addEventListener("assignment", (event) => {
        attemptsRef.current = 0;
        try {
          const data = JSON.parse(event.data) as AssignmentEvent;
          toast(data.message, "info");
        } catch {
          // malformed event — ignore
        }
      });

      es.addEventListener("error", () => {
        es.close();
        esRef.current = null;
        if (typeof document !== "undefined" && document.hidden) return;
        if (attemptsRef.current >= MAX_IDLE_RECONNECTS) return;
        const delay = Math.min(INITIAL_RECONNECT_MS * Math.pow(2, attemptsRef.current), MAX_RECONNECT_MS);
        attemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      });
    }

    if (typeof document === "undefined" || !document.hidden) {
      connect();
    }

    // Close the SSE connection while the tab is backgrounded so the serverless
    // function isn't kept alive polling for a tab nobody is looking at, and
    // reconnect when the tab becomes visible again.
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        esRef.current?.close();
        esRef.current = null;
      } else if (!esRef.current) {
        attemptsRef.current = 0;
        connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      esRef.current?.close();
      esRef.current = null;
    };
  }, [enabled]);
}
