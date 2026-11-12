import { defineRouting } from "next-intl/routing";

// English is the default and needs no prefix (/), French lives under /fr.
// Each locale serves the staff console under /<locale>/admin, which Access
// guards: a new one goes into the Pulumi project's adminPaths and Ansible's
// peal_access_paths too (packages/peal-infra/ansible/tests/test_cloudflared.py
// checks it).
export const routing = defineRouting({
  defaultLocale: "en",
  localePrefix: "as-needed",
  locales: ["en", "fr"],
});
