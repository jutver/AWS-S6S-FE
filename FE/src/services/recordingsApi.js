import { apiClient } from "./apiClient";

export function getMyProfile() {
  return apiClient.get("/api/me");
}

export function getRecordings(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value);
    }
  });

  const query = searchParams.toString();
  return apiClient.get(`/api/recordings${query ? `?${query}` : ""}`);
}

export function getRecordingById(recordingId) {
  return apiClient.get(`/api/recordings/${recordingId}`);
}

export function getTranscript(recordingId) {
  return apiClient.get(`/api/recordings/${recordingId}/transcript`);
}

export function getSummary(recordingId) {
  return apiClient.get(`/api/recordings/${recordingId}/summary`);
}

export function askAssistant(recordingId, message) {
  return apiClient.post(`/api/recordings/${recordingId}/assistant/query`, {
    message,
    includeContext: true,
  });
}
