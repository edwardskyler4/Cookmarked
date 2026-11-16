export type CapturePlatform = "Facebook" | "Instagram" | "Pinterest";

export interface CaptureMetadata {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  mediaType?: string;
}

export interface CaptureMetadataProvider {
  fetch(canonicalUrl: string): Promise<CaptureMetadata | null>;
}

export interface NewCapture {
  authUserId: string;
  canonicalUrl: string;
  platform: CapturePlatform;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  mediaType?: string;
}

export interface Capture extends NewCapture {
  captureId: number;
}

export interface CaptureRepository {
  findByCanonicalUrl(
    authUserId: string,
    canonicalUrl: string,
  ): Promise<Capture | null>;
  save(capture: NewCapture): Promise<Capture>;
}
