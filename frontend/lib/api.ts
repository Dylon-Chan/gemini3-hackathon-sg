import { API_BASE } from "./constants";

export interface UploadResponse {
  session_id: string;
  original_image_url: string;
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

export async function startProcessing(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/process/${sessionId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Process start failed: ${res.statusText}`);
}
