import {
  parseCaptureUrl,
} from "./captureUrl.ts";
import type {
  Capture,
  CaptureMetadataProvider,
  CaptureRepository,
  NewCapture,
} from "../domain/Capture.ts";

export type {
  CaptureMetadataProvider,
  CaptureRepository,
} from "../domain/Capture.ts";

export interface CaptureResult {
  duplicate: boolean;
  capture: Capture;
}

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export async function captureLink(
  repository: CaptureRepository,
  metadataProvider: CaptureMetadataProvider,
  authUserId: string,
  inputUrl: string,
  shareText?: string,
): Promise<CaptureResult> {
  const { canonicalUrl, platform } = parseCaptureUrl(inputUrl);
  const existing = await repository.findByCanonicalUrl(
    authUserId,
    canonicalUrl,
  );
  if (existing) return { duplicate: true, capture: existing };

  const metadata = await metadataProvider.fetch(canonicalUrl);
  const metadataDescription = optionalText(metadata?.description);
  const normalizedShareText = optionalText(shareText);
  const description = metadataDescription
    ? normalizedShareText
      ? `${metadataDescription}\n\nShared text: ${normalizedShareText}`
      : metadataDescription
    : normalizedShareText
      ? `Metadata unavailable. Shared text: ${normalizedShareText}`
      : "Metadata unavailable. Please complete this recipe manually.";
  const thumbnailUrl = optionalText(metadata?.thumbnailUrl);
  const mediaType = optionalText(metadata?.mediaType);
  const title = optionalText(metadata?.title) ?? "Imported recipe";
  const capture: NewCapture = {
    authUserId,
    canonicalUrl,
    platform,
    title,
    description,
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(mediaType ? { mediaType } : {}),
  };

  return { duplicate: false, capture: await repository.save(capture) };
}
