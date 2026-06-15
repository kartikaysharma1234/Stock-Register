import {
  CategoryModel,
  DepartmentModel,
  OrganizationModel,
  WarehouseModel,
} from "./schemas";

export class OrganisationRepository {
  createOrganization(data: {
    name: string;
    code: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    return OrganizationModel.create(data);
  }

  findOrganizationById(id: string) {
    return OrganizationModel.findById(id);
  }

  listOrganizations() {
    return OrganizationModel.find().sort({ name: 1 });
  }

  updateOrganization(id: string, data: Record<string, unknown>) {
    return OrganizationModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
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
    return WarehouseModel.find({ organizationId, isActive: true }).sort({
      name: 1,
    });
  }

  updateWarehouse(
    organizationId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    return WarehouseModel.findOneAndUpdate(
      { _id: id, organizationId },
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
