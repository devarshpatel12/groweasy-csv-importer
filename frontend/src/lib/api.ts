import type { BatchProgress, ImportResult } from "@/types/crm";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      (data as { error?: string }).error ?? "Request failed",
      response.status
    );
  }

  return data as T;
}

export async function importCsvAsync(file: File): Promise<{ jobId: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/import?async=true`, {
    method: "POST",
    body: formData,
  });

  const data = await handleResponse<{
    success: boolean;
    jobId: string;
  }>(response);

  return { jobId: data.jobId };
}

export async function importCsvSync(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/import`, {
    method: "POST",
    body: formData,
  });

  const data = await handleResponse<{
    success: boolean;
    data: ImportResult;
  }>(response);

  return data.data;
}

export function streamJobProgress(
  jobId: string,
  onProgress: (progress: BatchProgress) => void,
  onError: (error: Error) => void
): () => void {
  const eventSource = new EventSource(
    `${API_URL}/api/import/jobs/${jobId}/stream`
  );

  eventSource.onmessage = (event) => {
    try {
      const progress = JSON.parse(event.data) as BatchProgress;
      onProgress(progress);

      if (progress.status === "completed" || progress.status === "failed") {
        eventSource.close();
        if (progress.status === "failed") {
          onError(new ApiError(progress.error ?? "Import failed"));
        }
      }
    } catch {
      onError(new ApiError("Failed to parse progress update"));
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    onError(new ApiError("Connection to server lost"));
  };

  return () => eventSource.close();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}
