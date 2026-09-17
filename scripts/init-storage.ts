import 'dotenv/config';
import { S3Client, CreateBucketCommand, PutBucketLifecycleConfigurationCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
const client = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION || 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! } });
const Bucket = process.env.S3_BUCKET!;
async function main() {
  try { await client.send(new HeadBucketCommand({ Bucket })); } catch { await client.send(new CreateBucketCommand({ Bucket })); }
  // No public-read policy. Hourly application deletion is primary; this is a physical deletion fallback.
  await client.send(new PutBucketLifecycleConfigurationCommand({ Bucket, LifecycleConfiguration: { Rules: [{ ID: 'creative-retention', Status: 'Enabled', Filter: { Prefix: '' }, Expiration: { Days: 3 }, AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 } }] } }));
  console.log('Private storage initialized with 3-day lifecycle.');
}
main().catch(() => { console.error('Storage initialization failed'); process.exit(1); });
