import { Controller, type ExecutionContext, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from '../auth/auth-user.js';
import type { TenantRecord, TenantRequest } from '../tenants/tenant-request.js';
import type { AccessService } from './access.service.js';
import { PermissionsGuard } from './permissions.guard.js';
import { RequirePermissions } from './require-permissions.decorator.js';

type Request = AuthenticatedRequest & TenantRequest;

const user = { id: 'user-1', email: 'host@example.com' };
const tenant: TenantRecord = {
  id: 'tenant-a',
  slug: 'adriatic',
  name: 'Adriatic Stays',
  logoUrl: null,
  primaryColor: null,
  contactEmail: null,
  currency: 'EUR',
};

@Controller()
class RoutesController {
  @RequirePermissions('listing:update')
  @Get()
  update(): void {}

  @Get()
  undeclared(): void {}
}

@RequirePermissions('tenant:read')
@Controller()
class AdminController {
  @Get()
  list(): void {}
}

function contextFor(
  request: Request,
  controller: new () => object,
  handler: string,
): ExecutionContext {
  return {
    getHandler: () => controller.prototype[handler as keyof object],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function createGuard(allowed: boolean) {
  const access = { can: vi.fn(() => Promise.resolve(allowed)) };
  const guard = new PermissionsGuard(
    new Reflector(),
    access as unknown as AccessService,
  );
  return { guard, access };
}

const tenantRequest = (): Request => ({
  headers: {},
  params: { tenantSlug: 'adriatic' },
  user,
  tenant,
});

describe('PermissionsGuard', () => {
  it("checks the handler's permissions in the tenant of the URL", async () => {
    const { guard, access } = createGuard(true);

    await expect(
      guard.canActivate(
        contextFor(tenantRequest(), RoutesController, 'update'),
      ),
    ).resolves.toBe(true);
    expect(access.can).toHaveBeenCalledWith('user-1', 'tenant-a', [
      'listing:update',
    ]);
  });

  it('checks a platform route without a tenant', async () => {
    const { guard, access } = createGuard(true);
    const request: Request = { headers: {}, params: {}, user };

    await expect(
      guard.canActivate(contextFor(request, AdminController, 'list')),
    ).resolves.toBe(true);
    expect(access.can).toHaveBeenCalledWith('user-1', null, ['tenant:read']);
  });

  it('answers a missing permission with 403 INSUFFICIENT_PERMISSIONS', async () => {
    const { guard } = createGuard(false);

    await expect(
      guard.canActivate(
        contextFor(tenantRequest(), RoutesController, 'update'),
      ),
    ).rejects.toMatchObject({
      status: 403,
      errorCode: 'INSUFFICIENT_PERMISSIONS',
    });
  });

  it('denies a handler that declares no permission', async () => {
    const { guard, access } = createGuard(true);

    await expect(
      guard.canActivate(
        contextFor(tenantRequest(), RoutesController, 'undeclared'),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(access.can).not.toHaveBeenCalled();
  });

  it('fails loudly when TenantGuard did not run on a tenant route', async () => {
    const { guard } = createGuard(true);
    const request: Request = {
      headers: {},
      params: { tenantSlug: 'adriatic' },
      user,
    };

    await expect(
      guard.canActivate(contextFor(request, RoutesController, 'update')),
    ).rejects.toThrow(/TenantGuard must run before/);
  });

  it('fails loudly on a route without a signed-in user', async () => {
    const { guard } = createGuard(true);
    const request: Request = { headers: {}, params: {} };

    await expect(
      guard.canActivate(contextFor(request, AdminController, 'list')),
    ).rejects.toThrow(/@Public\(\) route/);
  });
});
