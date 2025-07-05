import { UTApi, UTFile } from "uploadthing/server";
import { readFileSync } from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const utapi = new UTApi();

export async function uploadICS(filePath: string, customId: string): Promise<string> {
  const data = readFileSync(filePath);
  const fileName = path.basename(filePath);

  // Convert buffer to Blob-like UTFile
  const file = new UTFile(
    [data],       // binary content
    fileName,     // name
    { type: "text/calendar", customId }  // MIME type
  );

  const res = await utapi.uploadFiles([file], {
    acl: "public-read",
    contentDisposition: "inline",
  });

  const result = res[0];

  if (result.error || !result.data) {
    throw new Error(`Upload failed: ${result.error?.message}`);
  }

  const { key } = result.data;
  return key
}
