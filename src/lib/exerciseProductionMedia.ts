// The single read path for exercise media in the UI.
//
// Screens call THESE functions. They must not reach into exerciseMedia / exerciseGifs /
// machineImages / Exercise.videoUrl directly any more — those are evidence layers that feed
// the generated manifest, not view-model APIs. One read path is what makes the review status
// enforceable: a NEEDS_REVIEW or REJECTED asset physically cannot reach a screen through here.
//
// Honesty rules encoded below, not left to call sites:
//   • only APPROVED assets are returned; everything else resolves to null
//   • a null is a real answer — the caller renders the honest empty state, never a guess
//   • `videoTitle` is review metadata, NOT UI copy. Titles come from third-party channels and
//     some contain censored profanity; the user-facing label is always the dictionary string
//     «شاهد طريقة الأداء». `approvedVideoFor` therefore exposes no title for rendering.
//   • the embed URL is youtube-nocookie with no autoplay, and is only ever built after the
//     user taps — the caller must not mount an iframe before that.
import {
  EXERCISE_PRODUCTION_MANIFEST,
  type ExerciseImageAsset,
  type ExerciseProductionEntry,
} from '@/data/exerciseProductionManifest.generated'
import { canonicalExerciseId } from '@/data/exercises'

/** A video reference safe to surface. Deliberately carries no title — see the honesty rules above. */
export interface ApprovedVideoRef {
  youtubeVideoId: string
  canonicalUrl: string
  /** Attribution for the reference card. Null when research could not establish it. */
  channel: string | null
}

/** The manifest entry for an exercise, resolving legacy ids. Null for an unknown id. */
export function productionEntryFor(exerciseId: string): ExerciseProductionEntry | null {
  return (
    EXERCISE_PRODUCTION_MANIFEST[exerciseId] ??
    EXERCISE_PRODUCTION_MANIFEST[canonicalExerciseId(exerciseId)] ??
    null
  )
}

/** The approved image asset, or null when the honest empty state is the right answer. */
export function approvedImageFor(exerciseId: string): ExerciseImageAsset | null {
  const entry = productionEntryFor(exerciseId)
  if (!entry || entry.imageStatus !== 'APPROVED') return null
  return entry.image
}

/**
 * The approved video reference, or null.
 *
 * NEEDS_REVIEW, REJECTED and MISSING all resolve to null: a reference nobody signed off on is
 * not shown to a user, and a wrong video is worse than none.
 */
export function approvedVideoFor(exerciseId: string): ApprovedVideoRef | null {
  const entry = productionEntryFor(exerciseId)
  if (!entry || entry.videoStatus !== 'APPROVED' || !entry.video) return null
  const { youtubeVideoId, canonicalUrl, channel } = entry.video
  if (!youtubeVideoId || !canonicalUrl) return null
  return { youtubeVideoId, canonicalUrl, channel }
}

/** True when this exercise has a video the user may be offered. */
export function hasApprovedVideo(exerciseId: string): boolean {
  return approvedVideoFor(exerciseId) !== null
}

/**
 * Privacy-respecting embed URL — build this ONLY in response to the user's tap.
 *
 * `youtube-nocookie.com` avoids tracking cookies until playback; `rel=0` keeps the end-screen
 * suggestions inside the same channel; `autoplay` is absent on purpose — the user pressed play
 * once already, and a second surprise autoplay is exactly the behaviour this app avoids.
 */
export function videoEmbedUrl(exerciseId: string): string | null {
  const ref = approvedVideoFor(exerciseId)
  if (!ref) return null
  return `https://www.youtube-nocookie.com/embed/${ref.youtubeVideoId}?rel=0&modestbranding=1&playsinline=1`
}
