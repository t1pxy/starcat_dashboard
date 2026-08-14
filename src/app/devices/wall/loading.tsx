import { WallSkeleton } from "@/components/skeletons";

/**
 * The wall display is dark by design, so its loading state has to be too —
 * inheriting the light-mode skeleton from `/devices` meant a white flash across
 * a screen that lives on an office wall.
 */
export default function Loading() {
  return <WallSkeleton />;
}
