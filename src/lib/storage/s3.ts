import 'server-only';
import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * 인증 사진 저장소 (G-04).
 *
 * 브라우저가 S3로 직접 올린다. 서버를 거치면 EC2의 대역폭과 메모리를
 * 먹고, 주 60~90건이 몰리는 시간대에 앱 응답까지 함께 느려진다.
 * 서버는 서명된 주소만 발급한다.
 *
 * 버킷은 공개하지 않는다. 읽기도 서명된 주소로만 연다 —
 * 인증 사진에는 참여자 얼굴이 들어가므로 주소만 알면 누구나
 * 볼 수 있는 상태로 두면 안 된다.
 */
const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION ?? 'ap-northeast-2';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

let client: S3Client | null = null;
function s3(): S3Client | null {
  if (!BUCKET) return null;
  if (!client) {
    // 자격 증명은 SDK가 알아서 찾는다 — EC2 인스턴스 역할이면
    // 키를 파일에 두지 않아도 된다. 그쪽을 권장한다.
    client = new S3Client({ region: REGION });
  }
  return client;
}

export function storageEnabled(): boolean {
  return Boolean(BUCKET);
}

export const UPLOAD_LIMITS = { maxBytes: MAX_BYTES, allowed: [...ALLOWED] };

export interface UploadTicket {
  url: string;
  key: string;
}

/**
 * 올릴 주소를 발급한다.
 *
 * 키를 서버가 정한다. 브라우저가 정하게 하면 남의 사진을 덮어쓰거나
 * 버킷 아무 데나 쓸 수 있다.
 */
export async function createUploadTicket(
  connectId: string,
  contentType: string,
  bytes: number,
): Promise<UploadTicket | null> {
  const c = s3();
  if (!c || !BUCKET) return null;
  if (!ALLOWED.has(contentType)) return null;
  if (bytes <= 0 || bytes > MAX_BYTES) return null;

  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const key = `certifications/${connectId}/${randomUUID()}.${ext}`;

  const url = await getSignedUrl(
    c,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      // 길이를 못 박아 두면 서명을 받아 다른 큰 파일을 올릴 수 있다.
      ContentLength: bytes,
    }),
    { expiresIn: 300 },
  );

  return { url, key };
}

/**
 * 볼 수 있는 주소를 발급한다.
 *
 * 짧게 만료시킨다. 검수 화면에서 한 번 보는 용도라 길 이유가 없고,
 * 주소가 새어 나가도 오래 살아 있지 않다.
 */
export async function createViewUrl(key: string, seconds = 600): Promise<string | null> {
  const c = s3();
  if (!c || !BUCKET) return null;

  return getSignedUrl(c, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: seconds,
  });
}

/**
 * 지운다.
 *
 * 인증이 반려되거나 커넥트가 사라져도 사진은 S3에 남는다.
 * 저장 비용보다 개인정보가 계속 남아 있는 것이 문제다.
 */
export async function deleteObject(key: string): Promise<void> {
  const c = s3();
  if (!c || !BUCKET) return;
  try {
    await c.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // 지우지 못해도 DB의 인증 기록은 이미 정리됐다. 다시 시도하지 않는다.
  }
}
