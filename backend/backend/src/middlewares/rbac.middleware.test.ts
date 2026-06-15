import { NextFunction, Request, Response } from "express";
import { Permission, Role } from "../constants";
import { ApiError } from "../utils/api-error";
import { checkOwnership } from "./ownership.middleware";
import { checkPermission } from "./rbac.middleware";

const response = {} as Response;

describe("RBAC middleware", () => {
  it("uses resolved user permissions at route level", () => {
    const req = {
      user: {
        id: "viewer-1",
        organizationId: "org-1",
        role: Role.VIEWER,
        permissions: [Permission.USER_CREATE],
        departmentIds: [],
        warehouseIds: [],
      },
    } as unknown as Request;
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    checkPermission(Permission.USER_CREATE)(req, response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("rejects missing permissions", () => {
    const req = {
      user: {
        id: "viewer-1",
        organizationId: "org-1",
        role: Role.VIEWER,
        permissions: [],
        departmentIds: [],
        warehouseIds: [],
      },
    } as unknown as Request;
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    checkPermission(Permission.USER_CREATE)(req, response, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(ApiError);
  });

  it("blocks department heads from acting outside their departments", () => {
    const req = {
      user: {
        id: "head-1",
        organizationId: "org-1",
        role: Role.DEPARTMENT_HEAD,
        permissions: [Permission.REQUEST_CREATE],
        departmentIds: ["department-1"],
        warehouseIds: [],
      },
      validated: {
        body: { departmentId: "department-2" },
      },
    } as unknown as Request;
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    checkOwnership(req, response, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(ApiError);
  });

  it("allows department heads to act within their departments", () => {
    const req = {
      user: {
        id: "head-1",
        organizationId: "org-1",
        role: Role.DEPARTMENT_HEAD,
        permissions: [Permission.REQUEST_CREATE],
        departmentIds: ["department-1"],
        warehouseIds: [],
      },
      validated: {
        body: { departmentId: "department-1" },
      },
    } as unknown as Request;
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    checkOwnership(req, response, next);

    expect(next).toHaveBeenCalledWith();
  });
});
