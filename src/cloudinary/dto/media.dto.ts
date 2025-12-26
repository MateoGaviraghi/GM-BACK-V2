export interface MediaFile {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format: string;
  bytes: number;
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  };
  thumbnail?: string; // Para videos
  duration?: number; // Para videos
}

export interface UploadResponse {
  message: string;
  file: MediaFile;
}
