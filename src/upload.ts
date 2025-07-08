import { readFileSync } from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Initialize R2 client with AWS SDK v3
const s3Client = new S3Client({
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID!,
    secretAccessKey: SECRET_ACCESS_KEY!,
  },
  region: 'auto',
  // Force path-style URLs for R2 compatibility
  forcePathStyle: false,
});

export async function uploadICS(
  filePath: string,
  customId: string
): Promise<string> {
  const data = readFileSync(filePath);
  const key = `${customId}.ics`;

  try {
    // Create the put object command
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME!,
      Key: key,
      Body: data,
      ContentType: 'text/calendar',
      // Note: ACL is handled differently in SDK v3 and may not be supported by R2
      // You might need to set bucket policies instead
      Metadata: {
        'uploaded-by': 'bun-calendar-export',
        'upload-timestamp': new Date().toISOString(),
      },
    });

    // Upload the file to R2
    const response = await s3Client.send(command);
    
    console.log(`✅ File uploaded successfully: ${key}`);
    console.log(`📋 ETag: ${response.ETag}`);

    // Return the public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    return publicUrl;
  } catch (error) {
    console.error("❌ Upload failed:", error);
    throw new Error(`Failed to upload file: ${error}`);
  }
}