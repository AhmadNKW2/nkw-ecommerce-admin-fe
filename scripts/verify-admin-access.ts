/**
 * Comprehensive admin-access verification.
 * Run: pnpm verify:admin-access
 */
import {
  ADMIN_ACCESS_KEYS,
  CATALOG_PRESET_ACCESS,
  DEFAULT_ADMIN_ACCESS,
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
  concepts: ["/concepts", "/settings/terms"],
  archived: [
    "/archived-products",
    "/archived-categories",
    "/archived-vendors",
    "/archived-brands",
  ],
  analytics: ["/analytics"],
  settings: ["/settings/seo", "/settings/features", "/settings/popup"],
  admins: ["/admins", "/admins/create"],
  catalog_requests: ["/catalog-requests"],
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
    })),
  );
}

function testResolveAdminAccess() {
  const adminResolved = resolveAdminAccess({ role: "admin" });
  assert("resolveAdminAccess: admin gets full access", ADMIN_ACCESS_KEYS.every((k) => adminResolved[k]));

  const catalogPresetAdmin = resolveAdminAccess({
    role: "admin",
    adminAccess: CATALOG_PRESET_ACCESS,
  });
  assert(
    "resolveAdminAccess: admin + catalog preset keeps admins=false",
    catalogPresetAdmin.admins === false &&
      catalogPresetAdmin.products === true &&
      catalogPresetAdmin.concepts === true &&
      catalogPresetAdmin.settings === false,
  );

  const explicit = resolveAdminAccess({
    role: "admin",
    adminAccess: makeAccess({ settings: false, orders: false }),
  });
  assert("resolveAdminAccess: explicit settings=false", explicit.settings === false);
  assert("resolveAdminAccess: explicit orders=false", explicit.orders === false);
  assert("resolveAdminAccess: explicit products stays true", explicit.products === true);
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

function testCatalogPresetDefaults() {
  const access = CATALOG_PRESET_ACCESS;
  const canAccess = canAccessFactory(access);

  assert("catalog preset can access products", canAccessRoute("/products", "admin", canAccess));
  assert("catalog preset blocked from orders", !canAccessRoute("/orders", "admin", canAccess));
  assert("catalog preset blocked from settings/seo", !canAccessRoute("/settings/seo", "admin", canAccess));
  assert("catalog preset can access settings/terms via concepts", canAccessRoute("/settings/terms", "admin", canAccess));
  assert("catalog preset blocked from product pricing", !canAccessRoute("/products/pricing", "admin", canAccess));
  assert("catalog preset blocked from archived", !canAccessRoute("/archived-products", "admin", canAccess));
}

function testConceptsTermsAccess() {
  const conceptsOnly = makeAccess({ concepts: true, settings: false });
  const canAccessConceptsOnly = canAccessFactory(conceptsOnly);

  assert("admin concepts=true settings=false can access /concepts", canAccessRoute("/concepts", "admin", canAccessConceptsOnly));
  assert(
    "admin concepts=true settings=false can access /settings/terms",
    canAccessRoute("/settings/terms", "admin", canAccessConceptsOnly),
  );

  const settingsOnly = makeAccess({ concepts: false, settings: true });
  assert(
    "admin settings=true concepts=false blocked from /concepts",
    !canAccessRoute("/concepts", "admin", canAccessFactory(settingsOnly)),
  );
  assert(
    "admin settings=true concepts=false blocked from /settings/terms",
    !canAccessRoute("/settings/terms", "admin", canAccessFactory(settingsOnly)),
  );
}

function testArchivedPermission() {
  const access = makeAccess({ archived: false, products: true, categories: true });
  const canAccess = canAccessFactory(access);

  assert("archived=false blocks archived products even with products=true", !canAccessRoute("/archived-products", "admin", canAccess));
  assert("archived=false blocks archived categories even with categories=true", !canAccessRoute("/archived-categories", "admin", canAccess));
  assert("archived=true allows archived routes", canAccessRoute("/archived-products", "admin", canAccessFactory(makeAccess({ archived: true }))));
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

      const visible = passesAdminAccessCheck(link.adminAccess, {
        role: "admin",
        canAccess,
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
    "settings nav shows only terms when concepts=true settings=false",
    filteredConceptsOnly.length === 1 && filteredConceptsOnly[0]?.href === "/settings/terms",
  );

  const allOff = makeAccess({ settings: false, concepts: false });
  const filteredAllOff = filterSettingsLinksByAccess(SETTINGS_LINK_DEFINITIONS, {
    role: "admin",
    canAccess: canAccessFactory(allOff),
  });
  assert("settings nav empty when settings=false and concepts=false", filteredAllOff.length === 0);

  const catalogFiltered = filterSettingsLinksByAccess(SETTINGS_LINK_DEFINITIONS, {
    role: "admin",
    canAccess: canAccessFactory(CATALOG_PRESET_ACCESS),
  });
  assert(
    "settings nav shows only terms for catalog preset admin",
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
    "/settings/terms uses concepts access",
    getRouteAccessRule("/settings/terms")?.access === "concepts",
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
  testCatalogPresetDefaults();
  testConceptsTermsAccess();
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
