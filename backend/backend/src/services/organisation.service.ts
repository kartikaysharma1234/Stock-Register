import { Role } from "../constants/roles";
import { organisationRepository } from "../repository/organisation.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";

export class OrganisationService {
  private organizationId(actor: AuthUser, requestedOrganizationId?: string) {
    if (actor.role === Role.SUPER_ADMIN && requestedOrganizationId) {
      return requestedOrganizationId;
    }
    if (!actor.organizationId) {
      throw new ApiError(400, "Organization context is required");
    }
    return actor.organizationId;
  }

  async createOrganization(actor: AuthUser, data: Record<string, unknown>) {
    if (actor.role !== Role.SUPER_ADMIN) {
      throw new ApiError(403, "Only super admins can create organizations");
    }
    const organization = await organisationRepository.createOrganization(
      data as Parameters<
        typeof organisationRepository.createOrganization
      >[0],
    );
    await auditService.record(
      { actorId: actor.id },
      {
        action: "organization.create",
        entityType: "Organization",
        entityId: organization.id,
        after: organization.toObject(),
      },
    );
    return organization;
  }

  listOrganizations(actor: AuthUser) {
    if (actor.role !== Role.SUPER_ADMIN) {
      throw new ApiError(403, "Only super admins can list all organizations");
    }
    return organisationRepository.listOrganizations();
  }

  async getOrganization(actor: AuthUser, id?: string) {
    const organizationId =
      actor.role === Role.SUPER_ADMIN && id ? id : actor.organizationId;
    if (!organizationId) throw new ApiError(400, "Organization is required");
    const organization =
      await organisationRepository.findOrganizationById(organizationId);
    if (!organization) throw new ApiError(404, "Organization not found");
    return organization;
  }

  async updateOrganization(
    actor: AuthUser,
    id: string | undefined,
    data: Record<string, unknown>,
  ) {
    const organizationId =
      actor.role === Role.SUPER_ADMIN && id ? id : actor.organizationId;
    if (!organizationId) throw new ApiError(400, "Organization is required");
    const organization = await organisationRepository.updateOrganization(
      organizationId,
      data,
    );
    if (!organization) throw new ApiError(404, "Organization not found");
    return organization;
  }

  createDepartment(actor: AuthUser, data: Record<string, unknown>) {
    return organisationRepository.createDepartment(
      this.organizationId(actor, data.organizationId as string | undefined),
      data,
    );
  }

  listDepartments(actor: AuthUser, organizationId?: string) {
    return organisationRepository.listDepartments(
      this.organizationId(actor, organizationId),
    );
  }

  updateDepartment(actor: AuthUser, id: string, data: Record<string, unknown>) {
    return organisationRepository.updateDepartment(
      this.organizationId(actor),
      id,
      data,
    );
  }

  createWarehouse(actor: AuthUser, data: Record<string, unknown>) {
    return organisationRepository.createWarehouse(
      this.organizationId(actor, data.organizationId as string | undefined),
      data,
    );
  }

  listWarehouses(actor: AuthUser, organizationId?: string) {
    return organisationRepository.listWarehouses(
      this.organizationId(actor, organizationId),
    );
  }

  updateWarehouse(actor: AuthUser, id: string, data: Record<string, unknown>) {
    return organisationRepository.updateWarehouse(
      this.organizationId(actor),
      id,
      data,
    );
  }

  createCategory(actor: AuthUser, data: Record<string, unknown>) {
    return organisationRepository.createCategory(
      this.organizationId(actor, data.organizationId as string | undefined),
      data,
    );
  }

  listCategories(actor: AuthUser, organizationId?: string) {
    return organisationRepository.listCategories(
      this.organizationId(actor, organizationId),
    );
  }

  updateCategory(actor: AuthUser, id: string, data: Record<string, unknown>) {
    return organisationRepository.updateCategory(
      this.organizationId(actor),
      id,
      data,
    );
  }
}

export const organisationService = new OrganisationService();
