import { UTApi, UTFile } from "uploadthing/server";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const utapi = new UTApi();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadICS(
  filePath: string,
  customId: string
): Promise<string> {
  const data = readFileSync(filePath);
  const fileName = path.basename(filePath);

  const file = new UTFile([data], fileName, {
    type: "text/calendar",
    customId,
  });

 const res = await utapi.deleteFiles(customId, { keyType: "customId" });

 if (!res.success){
    console.error("❌ Failed to delete previous file:", res.deletedCount);
    throw new Error("Failed to delete previous file");
 }

  const uploadRes = await utapi.uploadFiles([file], {
      
  })

  if(uploadRes[0].error){
  console.error("❌ Upload failed:");
    console.log(uploadRes[0].error);
  }

 return new Promise((resolve, reject) => "test")
}
