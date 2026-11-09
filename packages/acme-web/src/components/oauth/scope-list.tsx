import { Option, Schema } from "effect";
import { useTranslations } from "next-intl";

// The catalogue key that describes each scope Acme's authorization server
// knows.
const scopeKeys = {
  email: "email",
  offline_access: "offlineAccess",
  openid: "openid",
  profile: "profile",
  "workspace:read": "workspaceRead",
  "workspace:write": "workspaceWrite",
} as const;

const decodeKnownScope = Schema.decodeUnknownOption(
  Schema.Literals([
    "email",
    "offline_access",
    "openid",
    "profile",
    "workspace:read",
    "workspace:write",
  ])
);

// Writing includes reading, which needs no line of its own then.
const shown = (scopes: readonly string[]): readonly string[] =>
  scopes.includes("workspace:write")
    ? scopes.filter((scope) => scope !== "workspace:read")
    : scopes;

// What a client asks to do, one line per scope, in the reader's language.
export const ScopeList = ({
  scopes,
}: {
  readonly scopes: readonly string[];
}) => {
  const t = useTranslations("OAuth.scopes");

  return (
    <ul className="text-muted-foreground flex list-disc flex-col gap-1 ps-5 text-sm">
      {shown(scopes).map((scope) => (
        <li key={scope}>
          {Option.match(decodeKnownScope(scope), {
            onNone: () => t("other", { scope }),
            onSome: (known) => t(scopeKeys[known]),
          })}
        </li>
      ))}
    </ul>
  );
};
