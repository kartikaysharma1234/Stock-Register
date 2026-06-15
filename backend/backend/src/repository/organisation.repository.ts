import { ClientSession, Types } from "mongoose";
import {
  PLAN_LIMITS,
  PlanLimits,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../constants";
import {
  CategoryModel,
  DepartmentModel,
  IAddress,
  ItemModel,
  OrganizationModel,
  SubscriptionModel,
  UserModel,
  WarehouseModel,
} from "./schemas";

export interface OrganizationCreateInput {
  name: string;
  slug: string;
  code: string;
  logo?: string;
  address?: IAddress;
  gstin?: string;
  email?: string;
  phone?: string;
  billingEmail: string;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  planLimits?: PlanLimits;
}

export interface OrganizationUsage {
  users: number;
  warehouses: number;
  items: number;
}

export class OrganisationRepository {
  createOrganization(data: OrganizationCreateInput, session?: ClientSession) {
    const payload = {
      ...data,
      subscriptionPlan: data.subscriptionPlan ?? SubscriptionPlan.FREE,
      subscriptionStatus:
        data.subscriptionStatus ?? SubscriptionStatus.ACTIVE,
      planLimits:
        data.planLimits ?? { ...PLAN_LIMITS[SubscriptionPlan.FREE] },
    };
    if (session) {
      return OrganizationModel.create([payload], { session }).then(
        ([organization]) => organization,
      );
    }
    return OrganizationModel.create(payload);
  }

  findOrganizationById(id: string) {
    return OrganizationModel.findOne({
      _id: id,
      isDeleted: false,
    });
  }

  findOrganizationBySlug(slug: string) {
    return OrganizationModel.findOne({
      slug: slug.toLowerCase(),
      isDeleted: false,
    });
  }

  findOrganizationByRazorpaySubscriptionId(razorpaySubscriptionId: string) {
    return OrganizationModel.findOne({
      razorpaySubscriptionId,
      isDeleted: false,
    });
  }

  listOrganizations() {
    return OrganizationModel.find({ isDeleted: false }).sort({ name: 1 });
  }

  updateOrganization(
    id: string,
    data: Record<string, unknown>,
    session?: ClientSession,
  ) {
    return OrganizationModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      data,
      { new: true, runValidators: true, session },
    );
  }

  createSubscription(
    data: {
      organizationId: string | Types.ObjectId;
      plan: SubscriptionPlan;
      status: SubscriptionStatus;
      startDate: Date;
      endDate?: Date;
      amount: number;
      currency?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySubscriptionId?: string;
      invoiceUrl?: string;
    },
    session?: ClientSession,
  ) {
    if (session) {
      return SubscriptionModel.create([data], { session }).then(
        ([subscription]) => subscription,
      );
    }
    return SubscriptionModel.create(data);
  }

  findCurrentSubscription(organizationId: string) {
    return SubscriptionModel.findOne({
      organizationId,
      status: SubscriptionStatus.ACTIVE,
      isDeleted: false,
    }).sort({ createdAt: -1 });
  }

  findPendingSubscription(organizationId: string) {
    return SubscriptionModel.findOne({
      organizationId,
      status: SubscriptionStatus.PENDING,
      isDeleted: false,
    }).sort({ createdAt: -1 });
  }

  findSubscriptionByRazorpayId(
    razorpaySubscriptionId: string,
    session?: ClientSession,
  ) {
    return SubscriptionModel.findOne({
      razorpaySubscriptionId,
      isDeleted: false,
    }).session(session ?? null);
  }

  findActiveFreeSubscription(
    organizationId: string,
    session?: ClientSession,
  ) {
    return SubscriptionModel.findOne({
      organizationId,
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      isDeleted: false,
    }).session(session ?? null);
  }

  updateSubscriptionByRazorpayId(
    organizationId: string,
    razorpaySubscriptionId: string,
    data: Record<string, unknown>,
    session?: ClientSession,
  ) {
    return SubscriptionModel.findOneAndUpdate(
      {
        organizationId,
        razorpaySubscriptionId,
        isDeleted: false,
      },
      data,
      { new: true, runValidators: true, session },
    );
  }

  expireOtherSubscriptions(
    organizationId: string,
    exceptSubscriptionId: string,
    session?: ClientSession,
  ) {
    return SubscriptionModel.updateMany(
      {
        organizationId,
        _id: { $ne: exceptSubscriptionId },
        status: SubscriptionStatus.ACTIVE,
        isDeleted: false,
      },
      { status: SubscriptionStatus.EXPIRED, endDate: new Date() },
      { session },
    );
  }

  async getUsage(organizationId: string): Promise<OrganizationUsage> {
    const activeTenantFilter = {
      organizationId,
      isActive: true,
      isDeleted: { $ne: true },
    };
    const [users, warehouses, items] = await Promise.all([
      UserModel.countDocuments(activeTenantFilter),
      WarehouseModel.countDocuments(activeTenantFilter),
      ItemModel.countDocuments(activeTenantFilter),
    ]);
    return { users, warehouses, items };
  }

  createDepartment(organizationId: string, data: Record<string, unknown>) {
    return DepartmentModel.create({ ...data, organizationId });
  }

  listDepartments(organizationId: string) {
    return DepartmentModel.find({ organizationId, isActive: true }).sort({
      name: 1,
    });
  }

  updateDepartment(
    organizationId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    return DepartmentModel.findOneAndUpdate(
      { _id: id, organizationId },
      data,
      { new: true, runValidators: true },
    );
  }

  createWarehouse(organizationId: string, data: Record<string, unknown>) {
    return WarehouseModel.create({ ...data, organizationId });
  }

  listWarehouses(organizationId: string) {
    return WarehouseModel.find({
      organizationId,
      isActive: true,
      isDeleted: { $ne: true },
    }).sort({ name: 1 });
  }

  updateWarehouse(
    organizationId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    return WarehouseModel.findOneAndUpdate(
      { _id: id, organizationId, isDeleted: { $ne: true } },
      data,
      { new: true, runValidators: true },
    );
  }

  createCategory(organizationId: string, data: Record<string, unknown>) {
    return CategoryModel.create({ ...data, organizationId });
  }

  listCategories(organizationId: string) {
    return CategoryModel.find({ organizationId, isActive: true }).sort({
      name: 1,
    });
  }

  updateCategory(
    organizationId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    return CategoryModel.findOneAndUpdate(
      { _id: id, organizationId },
      data,
      { new: true, runValidators: true },
    );
  }
}

export const organisationRepository = new OrganisationRepository();
