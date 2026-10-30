import apiClient from "./apiClient";
import type { ApiResponse } from "./authService";

export interface RecordTelemetryEventPayload {
  eventType?: string;
  intent?: string;
  durationMs?: number;
  fieldsCorrectedCount?: number;
  acceptedWithoutEdits?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

export interface TelemetryEventItem {
  id: string;
  eventType: string;
  intent: string;
  durationMs: number;
  fieldsCorrectedCount: number;
  acceptedWithoutEdits: boolean;
  isError: boolean;
  createdAt: string;
}

export interface TelemetrySummary {
  totalDraftsRecorded: number;
  totalConfirmed: number;
  confirmedWithoutEdits: number;
  acceptanceRate: number;
  averageRecordingTimeMs: number;
  averageFieldsCorrected: number;
  totalErrors: number;
  errorRate: number;
  recentEvents: TelemetryEventItem[];
}

export const telemetryService = {
  recordEvent: async (payload: RecordTelemetryEventPayload): Promise<void> => {
    try {
      await apiClient.post<ApiResponse<boolean>>("/telemetry/events", {
        eventType: payload.eventType || "DraftConfirmed",
        intent: payload.intent || "general",
        durationMs: payload.durationMs ?? 0,
        fieldsCorrectedCount: payload.fieldsCorrectedCount ?? 0,
        acceptedWithoutEdits: payload.acceptedWithoutEdits ?? true,
        isError: payload.isError ?? false,
        errorMessage: payload.errorMessage,
      });
    } catch {
      // Privacy-respecting telemetry is best-effort and never halts UI flows
    }
  },

  getSummary: async (): Promise<ApiResponse<TelemetrySummary>> => {
    try {
      const response = await apiClient.get<ApiResponse<TelemetrySummary>>("/telemetry/summary");
      return response.data;
    } catch (error: unknown) {
      return {
        success: false,
        data: {
          totalDraftsRecorded: 0,
          totalConfirmed: 0,
          confirmedWithoutEdits: 0,
          acceptanceRate: 0,
          averageRecordingTimeMs: 0,
          averageFieldsCorrected: 0,
          totalErrors: 0,
          errorRate: 0,
          recentEvents: [],
        },
        message: "Could not fetch telemetry summary",
      };
    }
  },
};
