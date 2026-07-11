/**
 * Media API Service
 * Handles generic media upload via /api/media/upload
 */

import { httpClient } from "../../../lib/api/http-client";
import { ApiResponse } from "../../../types/common.types";

// Response from /api/media/upload
export interface UploadedMedia {
  id: number;
  url: string;
  type: 'image' | 'video' | 'document';
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

class MediaService {
  private endpoint = "/media";

  /**
   * Upload a media file to the generic media endpoint
   * Returns the media record with ID that can be used in product payloads
   */
  async uploadMedia(file: File): Promise<ApiResponse<UploadedMedia>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return httpClient.postFormData<ApiResponse<UploadedMedia>>(
      `${this.endpoint}/upload`,
      formData
    );
  }

  /**
   * Upload multiple media files
   * Returns array of uploaded media records
   */
  async uploadMultipleMedia(files: File[]): Promise<UploadedMedia[]> {
    const uploadPromises = files.map(file => this.uploadMedia(file));
    const responses = await Promise.all(uploadPromises);
    return responses.map(r => r.data);
  }

  /**
   * Upload a product document attachment (max 5MB)
   */
  async uploadAttachment(file: File): Promise<ApiResponse<UploadedMedia>> {
    const formData = new FormData();
    formData.append('file', file);

    return httpClient.postFormData<ApiResponse<UploadedMedia>>(
      `${this.endpoint}/upload-attachment`,
      formData
    );
  }
}

export const mediaService = new MediaService();
