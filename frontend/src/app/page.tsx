import { HomeFeedPage } from "@/modules/feed/components/FeedPages";
import { isLocalDemoMode } from "@/lib/demo-mode";
import { LiveScoringDemo } from "@/modules/devices/components/LiveScoringDemo";

export default function Page() {
  if (isLocalDemoMode()) return <LiveScoringDemo allowVideoUpload />;
  return <HomeFeedPage />;
}
