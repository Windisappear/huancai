import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { demoMode } from './core';
const client = new S3Client({ region: process.env.S3_REGION || 'us-east-1', endpoint: process.env.S3_ENDPOINT, forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY || '', secretAccessKey: process.env.S3_SECRET_KEY || '' } });
const Bucket = process.env.S3_BUCKET || 'frame-private';
const local = () => process.env.STORAGE_DRIVER === 'local' && demoMode();
function localPath(key: string) { const root = path.resolve(/* turbopackIgnore: true */ process.env.LOCAL_STORAGE_ROOT || '.local/assets'); const file = path.resolve(root, key); if (!file.startsWith(root + path.sep)) throw new Error('Invalid object key'); return file; }
export async function putObject(Key: string, Body: Buffer, ContentType: string) { if (local()) { const p = localPath(Key); await mkdir(path.dirname(p), { recursive: true }); await writeFile(p, Body); return; } await client.send(new PutObjectCommand({ Bucket, Key, Body, ContentType, CacheControl: 'private, no-store' })); }
export async function getObject(Key: string) { if (local()) return readFile(/* turbopackIgnore: true */ localPath(Key)); const o = await client.send(new GetObjectCommand({ Bucket, Key })); if (!o.Body) throw new Error('Missing storage object'); return Buffer.from(await o.Body.transformToByteArray()); }
export async function deleteObject(Key: string) { if (local()) { await rm(localPath(Key), { force: true }); return; } await client.send(new DeleteObjectCommand({ Bucket, Key })); }
