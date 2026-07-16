/**
 * Comprehensive admin-access verification.
 * Run: pnpm verify:admin-access
 */
import {
  ADMIN_ACCESS_KEYS,
  DEFAULT_ADMIN_ACCESS,
  DEFAULT_CATALOG_MANAGER_ACCESS,
  resolveAdminAccess,
  type AdminAccess,
  type AdminAccessKey,
} from "../app/src/lib/admin-access";
import { passesAdminAccessCheck, roleMatchesAllowedRoles } from "../app/src/lib/admin-access-checks";
import { canAccessRoute, getRouteAccessRule } from "../app/src/lib/route-admin-access";
import {
  SETTINGS_LINK_DEFINITIONS,
  filterSettingsLinksByAccess,
} from "../app/src/lib/settings-links";
import { sidebarConfig } from "../app/src/components/sidebar/sidebar.config";
import type { UserRole } from "../app/src/services/auth/types/auth.types";

type TestResult = { name: string; ok: boolean; detail?: string };

const results: TestResult[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  results.push({ name, ok: condition, detail });
  if (!condition) {
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function makeAccess(overrides: Partial<AdminAccess>): AdminAccess {
  return { ...DEFAULT_ADMIN_ACCESS, ...overrides };
}

function canAccessFactory(access: AdminAccess) {
  return (key: AdminAccessKey) => access[key];
}

/** Representative routes for each permission key. */
const PERMISSION_ROUTE_SAMPLES: Record<AdminAccessKey, string[]> = {
  products: ["/products", "/products/123"],
  product_pricing: ["/products/pricing", "/pricing-products"],
  categories: ["/categories", "/categories/create"],
  vendors: ["/vendors", "/vendors/1"],
  brands: ["/brands"],
  attributes: ["/attributes", "/attributes/create"],
  specifications: ["/specifications", "/specifications/1"],
  orders: ["/orders", "/orders/1/edit"],
  customers: ["/customers", "/customers/create"],
  partners: ["/partners", "/partners/create"],
  banners: ["/banners", "/banners/create"],
  cashback_rules: ["/cashback-rules", "/cashback-rules/1"],
  notes: ["/notes"],
  concepts: ["/concepts"],
  archived: [
    "/archived-products",
    "/archived-categories",
    "/archived-vendors",
    "/archived-brands",
  ],
  analytics: ["/analytics"],
  settings: ["/settings/seo", "/settings/features", "/settings/popup", "/settings/terms"],
  admins: ["/admins", "/admins/create"],
  catalog_requests: ["/catalog-requests"],
  // Product form steps gate form sections, not routes.
  product_form_basic: [],
  product_form_attributes: [],
  product_form_specifications: [],
  product_form_stock: [],
  product_form_weight_dimensions: [],
  product_form_media: [],
  product_form_attachments: [],
};

function collectSidebarLinks() {
  return sidebarConfig.groups.flatMap((group) =>
    group.links.map((link) => ({
      href: link.href,
      adminAccess:
        "adminAccess" in link ? (link.adminAccess as AdminAccessKey | undefined) : undefined,
      roles: link.roles,
      catalogManagerBypass:
        "catalogManagerBypass" in link ? link.catalogManagerBypass : undefined,
    })),
  );
}

function testResolveAdminAccess() {
  const adminResolved = resolveAdminAccess({ role: "admin" });
  assert("resolveAdminAccess: admin gets full access", ADMIN_ACCESS_KEYS.every((k) => adminResolved[k]));

  const catalogResolved = resolveAdminAccess({ role: "catalog_manager" });
  assert(
    "resolveAdminAccess: catalog_manager defaults match backend",
    catalogResolved.settings === false &&
      catalogResolved.orders === false &&
      catalogResolved.products === true,
  );

  const explicit = resolveAdminAccess({
    role: "admin",
    adminAccess: makeAccess({ settings: false, orders: false }),
  });
  assert("resolveAdminAccess: explicit settings=false", explicit.settings === false);
  assert("resolveAdminAccess: explicit orders=false", explicit.orders === false);
  assert("resolveAdminAccess: explicit products stays true", explicit.products === true);
  assert(
    "resolveAdminAccess: missing new keys inherit role defaults",
    resolveAdminAccess({
      role: "admin",
      adminAccess: { settings: false, products: true } as AdminAccess,
    }).concepts === true &&
      resolveAdminAccess({
        role: "admin",
        adminAccess: { settings: false, products: true } as AdminAccess,
      }).archived === true,
  );
}

function testEachPermissionDeniesAccess() {
  for (const key of ADMIN_ACCESS_KEYS) {
    const access = makeAccess({ [key]: false });
    const canAccess = canAccessFactory(access);

    for (const path of PERMISSION_ROUTE_SAMPLES[key]) {
      const allowed = canAccessRoute(path, "admin", canAccess);
      assert(`route denied when ${key}=false: ${path}`, !allowed);
    }
  }
}

function testEachPermissionAllowsAccessWhenEnabled() {
  for (const key of ADMIN_ACCESS_KEYS) {
    const access = makeAccess({ [key]: true });
    const canAccess = canAccessFactory(access);

    for (const path of PERMISSION_ROUTE_SAMPLES[key]) {
      const allowed = canAccessRoute(path, "admin", canAccess);
      assert(`route allowed when ${key}=true: ${path}`, allowed);
    }
  }
}

function testCatalogManagerDefaults() {
  const access = DEFAULT_CATALOG_MANAGER_ACCESS;
  const canAccess = canAccessFactory(access);

  assert("catalog_manager can access products", canAccessRoute("/products", "catalog_manager", canAccess));
  assert("catalog_manager blocked from orders", !canAccessRoute("/orders", "catalog_manager", canAccess));
  assert("catalog_manager blocked from settings/seo", !canAccessRoute("/settings/seo", "catalog_manager", canAccess));
  assert(
    "catalog_manager can access settings/terms via bypass",
    canAccessRoute("/settings/terms", "catalog_manager", canAccess),
  );
  assert(
    "catalog_manager blocked from product pricing",
    !canAccessRoute("/products/pricing", "catalog_manager", canAccess),
  );
}

function testSettingsTermsBypass() {
  const conceptsOnly = makeAccess({ concepts: true, settings: false });
  const canAccessConceptsOnly = canAccessFactory(conceptsOnly);

  assert("admin concepts=true settings=false can access /concepts", canAccessRoute("/concepts", "admin", canAccessConceptsOnly));
  assert(
    "admin concepts=true settings=false blocked from /settings/terms",
    !canAccessRoute("/settings/terms", "admin", canAccessConceptsOnly),
  );

  const settingsOnly = makeAccess({ concepts: false, settings: true });
  assert(
    "admin settings=true concepts=false blocked from /concepts",
    !canAccessRoute("/concepts", "admin", canAccessFactory(settingsOnly)),
  );
  assert(
    "admin settings=true concepts=false can access /settings/terms",
    canAccessRoute("/settings/terms", "admin", canAccessFactory(settingsOnly)),
  );

  assert(
    "catalog_manager bypasses settings check on terms route",
    canAccessRoute("/settings/terms", "catalog_manager", canAccessFactory(DEFAULT_CATALOG_MANAGER_ACCESS)),
  );
}

function testArchivedPermission() {
  const access = makeAccess({ archived: false, products: true, categories: true });
  const canAccess = canAccessFactory(access);

  assert("archived=false blocks archived products even with products=true", !canAccessRoute("/archived-products", "admin", canAccess));
  assert("archived=false blocks archived categories even with categories=true", !canAccessRoute("/archived-categories", "admin", canAccess));
  assert("archived=true allows archived routes", canAccessRoute("/archived-products", "admin", canAccessFactory(makeAccess({ archived: true }))));
  assert("catalog_manager blocked from archived routes", !canAccessRoute("/archived-products", "catalog_manager", canAccessFactory(DEFAULT_CATALOG_MANAGER_ACCESS)));
}

function testSidebarLinkCoverage() {
  const links = collectSidebarLinks();

  for (const link of links) {
    assert(`sidebar ${link.href} has adminAccess`, Boolean(link.adminAccess), `missing adminAccess`);
  }
}

function testSidebarVisibilityPerPermission() {
  const links = collectSidebarLinks();

  for (const key of ADMIN_ACCESS_KEYS) {
    const access = makeAccess({ [key]: false });
    const canAccess = canAccessFactory(access);

    for (const link of links) {
      if (!link.adminAccess || link.adminAccess !== key) continue;
      if (link.catalogManagerBypass) continue;

      const visible = passesAdminAccessCheck(link.adminAccess, {
        role: "admin",
        canAccess,
        catalogManagerBypass: link.catalogManagerBypass,
      }) && roleMatchesAllowedRoles("admin", link.roles);

      assert(`sidebar hides ${link.href} when ${key}=false`, !visible);
    }
  }
}

function testSettingsNavFiltering() {
  const conceptsOnly = makeAccess({ settings: false, concepts: true });
  const filteredConceptsOnly = filterSettingsLinksByAccess(SETTINGS_LINK_DEFINITIONS, {
    role: "admin",
    canAccess: canAccessFactory(conceptsOnly),
  });
  assert(
    "settings nav empty when concepts=true but settings=false",
    filteredConceptsOnly.length === 0,
  );

  const allOff = makeAccess({ settings: false, concepts: false });
  const filteredAllOff = filterSettingsLinksByAccess(SETTINGS_LINK_DEFINITIONS, {
    role: "admin",
    canAccess: canAccessFactory(allOff),
  });
  assert("settings nav empty when settings=false and concepts=false", filteredAllOff.length === 0);

  const catalogFiltered = filterSettingsLinksByAccess(SETTINGS_LINK_DEFINITIONS, {
    role: "catalog_manager",
    canAccess: canAccessFactory(DEFAULT_CATALOG_MANAGER_ACCESS),
  });
  assert(
    "settings nav shows only terms for catalog_manager",
    catalogFiltered.length === 1 && catalogFiltered[0]?.href === "/settings/terms",
  );

  const fullFiltered = filterSettingsLinksByAccess(SETTINGS_LINK_DEFINITIONS, {
    role: "admin",
    canAccess: canAccessFactory(DEFAULT_ADMIN_ACCESS),
  });
  assert("settings nav shows all links for full-access admin", fullFiltered.length === SETTINGS_LINK_DEFINITIONS.length);
}

function testRouteRuleOrdering() {
  assert(
    "/products/pricing uses product_pricing not products",
    getRouteAccessRule("/products/pricing")?.access === "product_pricing",
  );
  assert(
    "/settings/terms matched before generic /settings",
    getRouteAccessRule("/settings/terms")?.access === "settings",
  );
  assert(
    "/settings/terms has catalog manager bypass",
    getRouteAccessRule("/settings/terms")?.catalogManagerBypass === true,
  );
}

function testConstantTokenAdminTreatedAsAdmin() {
  const access = makeAccess({ admins: false });
  assert(
    "constant_token_admin denied admins route when admins=false",
    !canAccessRoute("/admins", "constant_token_admin", canAccessFactory(access)),
  );
  assert(
    "constant_token_admin passes role check on admin-only routes",
    roleMatchesAllowedRoles("constant_token_admin", ["admin"]),
  );
}

function run() {
  console.log("Verifying admin access permissions...\n");

  testResolveAdminAccess();
  testEachPermissionDeniesAccess();
  testEachPermissionAllowsAccessWhenEnabled();
  testCatalogManagerDefaults();
  testSettingsTermsBypass();
  testArchivedPermission();
  testSidebarLinkCoverage();
  testSidebarVisibilityPerPermission();
  testSettingsNavFiltering();
  testRouteRuleOrdering();
  testConstantTokenAdminTreatedAsAdmin();

  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);

  console.log(`\n${passed.length} passed, ${failed.length} failed (${results.length} total)`);

  if (failed.length > 0) {
    console.log("\nFailed tests:");
    for (const f of failed) {
      console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    }
    process.exit(1);
  }

  console.log("\nAll admin access permission checks passed.");
}

run();
