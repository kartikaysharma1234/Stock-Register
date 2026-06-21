import { randomBytes, timingSafeEqual } from "crypto";
import {
  ApiKeyStatus,
  AuditModule,
  Permission,
  Role,
} from "../constants";
import { hashToken } from "../helpers/hashing.helper";
import {
  ApiKeyListFilter,
  ApiKeyUsageFilter,
  apiKeyRepository,
} from "../repository/apiKey.repository";
import { UserModel } from "../repository/schemas";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";
import { permissionService } from "./permission.service";

export interface ApiKeyCreateInput {
  organizationId?: string;
  name: string;
  description?: string;
  scopes: Permission[];
  allowedIps?: string[];
  expiresAt?: Date;
}

export interface ApiKeyUpdateInput {
  name?: string;
  description?: string | null;
  scopes?: Permission[];
  allowedIps?: string[];
  expiresAt?: Date | null;
}

export interface ApiKeyAuthenticationResult {
  actor: AuthUser;
  apiKey: {
    id: string;
    organizationId: string;
    prefix: string;
    scopes: Permission[];
  };
}

const keyPrefix = "skr";

const uniqueValues = (values: string[] = []) =>
  [...new Set(values.map((value) => value.trim()).filter(Boolean))];

const uniquePermissions = (permissions: Permission[]) =>
  [...new Set(permissions)];

const generateKeyMaterial = () => {
  const prefix = randomBytes(6).toString("hex");
  const secret = randomBytes(32).toString("hex");
  const key = `${keyPrefix}_${prefix}_${secret}`;
  return {
    key,
    prefix,
    keyHash: hashToken(key),
    keyLast4: key.slice(-4),
  };
};

const parseKey = (value: string) => {
  const [scheme, prefix, secret] = value.split("_");
  if (scheme !== keyPrefix || !prefix || !secret) return undefined;
  return { prefix, keyHash: hashToken(value) };
};

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
};

export class ApiKeyService {
  private organizationId(actor: AuthUser, requestedOrganizationId?: string) {
    if (actor.role === Role.SUPER_ADMIN) {
      if (!requestedOrganizationId) {
        throw new ApiError(400, "organizationId is required");
      }
      return requestedOrganizationId;
    }
    if (!actor.organizationId) {
      throw new ApiError(400, "Organization context is required");
    }
    if (
      requestedOrganizationId &&
      requestedOrganizationId !== actor.organizationId
    ) {
      throw new ApiError(403, "Cross-organization access is not allowed");
    }
    return actor.organizationId;
  }

  private assertScopes(actor: AuthUser, scopes: Permission[]) {
    const granted = new Set(actor.permissions);
    const missing = scopes.filter((scope) => !granted.has(scope));
    if (missing.length) {
      throw new ApiError(403, "API key scopes exceed actor permissions");
    }
  }

  private assertNotExpired(expiresAt?: Date) {
    if (expiresAt && expiresAt <= new Date()) {
      throw new ApiError(422, "expiresAt must be in the future");
    }
  }

  async create(actor: AuthUser, input: ApiKeyCreateInput) {
    const organizationId = this.organizationId(actor, input.organizationId);
    const scopes = uniquePermissions(input.scopes);
    this.assertScopes(actor, scopes);
    this.assertNotExpired(input.expiresAt);
    const material = generateKeyMaterial();
    const apiKey = await apiKeyRepository.create({
      organizationId,
      name: input.name,
      description: input.description,
      prefix: material.prefix,
      keyHash: material.keyHash,
      keyLast4: material.keyLast4,
      scopes,
      allowedIps: uniqueValues(input.allowedIps),
      expiresAt: input.expiresAt,
      createdBy: actor.id,
    });
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "apikey.create",
        module: AuditModule.API_KEY,
        entityType: "ApiKey",
        entityId: apiKey.id,
        after: {
          name: apiKey.name,
          prefix: apiKey.prefix,
          scopes: apiKey.scopes,
        },
      },
    );
    return { apiKey, key: material.key };
  }

  list(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: ApiKeyListFilter = {},
  ) {
    return apiKeyRepository.list(
      this.organizationId(actor, requestedOrganizationId),
      filter,
    );
  }

  async get(actor: AuthUser, id: string, requestedOrganizationId?: string) {
    const apiKey = await apiKeyRepository.findById(
      this.organizationId(actor, requestedOrganizationId),
      id,
    );
    if (!apiKey) throw new ApiError(404, "API key not found");
    return apiKey;
  }

  async update(
    actor: AuthUser,
    id: string,
    input: ApiKeyUpdateInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const before = await apiKeyRepository.findById(organizationId, id);
    if (!before) throw new ApiError(404, "API key not found");
    if (input.scopes) this.assertScopes(actor, input.scopes);
    this.assertNotExpired(input.expiresAt ?? undefined);
    const update: Record<string, unknown> = {
      ...input,
      ...(input.scopes ? { scopes: uniquePermissions(input.scopes) } : {}),
      ...(input.allowedIps
        ? { allowedIps: uniqueValues(input.allowedIps) }
        : {}),
    };
    if (input.description === null) {
      delete update.description;
      update.$unset = {
        ...((update.$unset as Record<string, number> | undefined) ?? {}),
        description: 1,
      };
    }
    if (input.expiresAt === null) {
      delete update.expiresAt;
      update.$unset = {
        ...((update.$unset as Record<string, number> | undefined) ?? {}),
        expiresAt: 1,
      };
    }
    const apiKey = await apiKeyRepository.update(organizationId, id, update);
    if (!apiKey) throw new ApiError(404, "API key not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "apikey.update",
        module: AuditModule.API_KEY,
        entityType: "ApiKey",
        entityId: id,
        before: before.toObject(),
        after: apiKey.toObject(),
      },
    );
    return apiKey;
  }

  async rotate(actor: AuthUser, id: string, requestedOrganizationId?: string) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const before = await apiKeyRepository.findById(organizationId, id);
    if (!before) throw new ApiError(404, "API key not found");
    const material = generateKeyMaterial();
    const apiKey = await apiKeyRepository.update(organizationId, id, {
      prefix: material.prefix,
      keyHash: material.keyHash,
      keyLast4: material.keyLast4,
      status: ApiKeyStatus.ACTIVE,
      rotatedAt: new Date(),
      rotatedBy: actor.id,
      $unset: { revokedAt: 1, revokedBy: 1, revokeReason: 1 },
    });
    if (!apiKey) throw new ApiError(404, "API key not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "apikey.rotate",
        module: AuditModule.API_KEY,
        entityType: "ApiKey",
        entityId: id,
        before: { prefix: before.prefix },
        after: { prefix: apiKey.prefix },
      },
    );
    return { apiKey, key: material.key };
  }

  async revoke(
    actor: AuthUser,
    id: string,
    reason: string | undefined,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const apiKey = await apiKeyRepository.update(organizationId, id, {
      status: ApiKeyStatus.REVOKED,
      revokedAt: new Date(),
      revokedBy: actor.id,
      revokeReason: reason,
    });
    if (!apiKey) throw new ApiError(404, "API key not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "apikey.revoke",
        module: AuditModule.API_KEY,
        entityType: "ApiKey",
        entityId: id,
        after: { status: apiKey.status, reason },
      },
    );
    return apiKey;
  }

  async remove(actor: AuthUser, id: string, requestedOrganizationId?: string) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const apiKey = await apiKeyRepository.softDelete(
      organizationId,
      id,
      actor.id,
    );
    if (!apiKey) throw new ApiError(404, "API key not found");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "apikey.delete",
        module: AuditModule.API_KEY,
        entityType: "ApiKey",
        entityId: id,
        before: { name: apiKey.name, prefix: apiKey.prefix },
      },
    );
  }

  async usage(
    actor: AuthUser,
    id: string,
    requestedOrganizationId: string | undefined,
    filter: ApiKeyUsageFilter = {},
  ) {
    const organizationId = this.organizationId(actor, requestedOrganizationId);
    const apiKey = await apiKeyRepository.findById(organizationId, id);
    if (!apiKey) throw new ApiError(404, "API key not found");
    return apiKeyRepository.usageLogs(organizationId, id, filter);
  }

  async authenticateKey(
    rawKey: string,
    requestIp?: string,
  ): Promise<ApiKeyAuthenticationResult> {
    const parsed = parseKey(rawKey);
    if (!parsed) throw new ApiError(401, "Invalid API key");
    const apiKey = await apiKeyRepository.findByPrefixWithHash(parsed.prefix);
    if (!apiKey || !safeEqual(apiKey.keyHash, parsed.keyHash)) {
      throw new ApiError(401, "Invalid API key");
    }
    if (apiKey.status !== ApiKeyStatus.ACTIVE) {
      throw new ApiError(401, "API key is not active");
    }
    if (apiKey.expiresAt && apiKey.expiresAt <= new Date()) {
      await apiKeyRepository.update(apiKey.organizationId.toString(), apiKey.id, {
        status: ApiKeyStatus.EXPIRED,
      });
      throw new ApiError(401, "API key has expired");
    }
    if (
      apiKey.allowedIps.length &&
      (!requestIp || !apiKey.allowedIps.includes(requestIp))
    ) {
      throw new ApiError(403, "API key is not allowed from this IP address");
    }
    const creator = await UserModel.findOne({
      _id: apiKey.createdBy,
      organizationId: apiKey.organizationId,
      isActive: true,
      isDeleted: false,
    });
    if (!creator) throw new ApiError(401, "API key owner is inactive");
    const owner = await permissionService.buildAuthUser(creator);
    const ownerPermissions = new Set(owner.permissions);
    const scopedPermissions = apiKey.scopes.filter((scope) =>
      ownerPermissions.has(scope),
    );
    if (!scopedPermissions.length) {
      throw new ApiError(403, "API key has no active permissions");
    }
    await apiKeyRepository.markUsed(apiKey.id, requestIp);
    return {
      actor: {
        ...owner,
        permissions: scopedPermissions,
      },
      apiKey: {
        id: apiKey.id,
        organizationId: apiKey.organizationId.toString(),
        prefix: apiKey.prefix,
        scopes: scopedPermissions,
      },
    };
  }

  recordUsage(data: {
    organizationId: string;
    apiKeyId: string;
    method: string;
    path: string;
    ipAddress?: string;
    statusCode?: number;
    userAgent?: string;
  }) {
    return apiKeyRepository.createUsageLog(data);
  }
}

export const apiKeyService = new ApiKeyService();
