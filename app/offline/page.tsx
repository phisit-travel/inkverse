import OfflineLibrary from "@/components/ui/OfflineLibrary";

export const metadata = { title: "ออฟไลน์ — INKVERSE" };

// The service-worker offline fallback IS the offline library, so however a failed
// navigation lands here when offline, the downloaded chapters are right there.
export default function OfflinePage() {
  return <OfflineLibrary offlineNotice />;
}
