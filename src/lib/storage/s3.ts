import { S3Client } from '@aws-sdk/client-s3';
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
