import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
export async function generateDownloadUrl(storageKey: string): Promise<string> {
	const client = getS3Client();

	const command = new GetObjectCommand({
		Bucket: env.PLATFORM_S3_BUCKET,
		Key: storageKey,
	});

	const url = await getSignedUrl(client, command, {
		expiresIn: 60, // 1 minute
	});

	return url;
}
import { env } from '@/lib/env';

type TenantPhotoKeyParams = {
	tenantId: string;
	galleryId: string;
	photoId: string;
	filename: string;
};

export function getS3Client(): S3Client {
	return new S3Client({
		region: env.AWS_REGION,
	});
}

export function tenantPhotoKey({
	tenantId,
	galleryId,
	photoId,
	filename,
}: TenantPhotoKeyParams): string {
	return `tenant/${tenantId}/gallery/${galleryId}/photo/${photoId}/${filename}`;
}
