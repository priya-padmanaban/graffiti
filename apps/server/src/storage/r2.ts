/**
 * R2/S3 storage adapter
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config";
import * as fs from "fs";
import * as path from "path";

export interface StorageAdapter {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;
}

/**
 * R2 storage adapter using AWS SDK v3
 */
export class R2StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    this.client = new S3Client({
      region: "auto",
      endpoint: config.r2.endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
    this.bucket = config.r2.bucket;
    this.publicUrl = config.r2.publicUrl;
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.client.send(command);

    // Return public URL
    return this.publicUrl ? `${this.publicUrl}/${key}` : `${config.r2.endpoint}/${this.bucket}/${key}`;
  }
}

/**
 * Mock storage adapter that writes to local filesystem
 */
export class MockStorageAdapter implements StorageAdapter {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), "snapshots");
    // Ensure directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);
    
    // Return a local file URL (for development)
    return `file://${filePath}`;
  }
}

/**
 * Get storage adapter based on config
 */
export function getStorageAdapter(): StorageAdapter {
  if (config.r2.enabled && config.r2.endpoint && config.r2.bucket) {
    return new R2StorageAdapter();
  }
  return new MockStorageAdapter();
}

