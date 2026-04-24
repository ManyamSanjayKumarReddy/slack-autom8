import { toast } from "sonner";

export async function handleApiError(res: Response, fallback = "Something went wrong") {
  if (res.status === 403) {
    toast.error("You don't have permission to access this");
    return;
  }
  let msg = fallback;
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") msg = data.detail;
    else if (typeof data?.message === "string") msg = data.message;
  } catch {
    // ignore
  }
  toast.error(msg);
}
