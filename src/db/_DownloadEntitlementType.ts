// Type for DownloadEntitlement createMany
export type DownloadEntitlementCreateInput = {
  tenantId: string;
  galleryId: string;
  clientUsername: string;
  photoId: string;
  purchaseId: string;
  status: "ACTIVE";
  grantedAt: Date;
  expiresAt?: Date | null;
};
