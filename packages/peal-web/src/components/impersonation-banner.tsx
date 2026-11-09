import { Option } from "effect";
import { getTranslations } from "next-intl/server";

import { currentUserOrNone } from "#auth/session.ts";
import { StopImpersonating } from "#components/stop-impersonating.tsx";

// Above every page while staff act as someone: who, what they may not do,
// and the way back to their own account.
export const ImpersonationBanner = async () => {
  const me = await currentUserOrNone();

  if (Option.isNone(me) || me.value.impersonatedBy === null) {
    return null;
  }

  const { user } = me.value;
  const t = await getTranslations("Impersonation");

  return (
    <section
      aria-label={t("label")}
      className="bg-muted text-foreground border-b"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <p>{t("notice", { email: user.email, name: user.name })}</p>
        <StopImpersonating userId={user.id} />
      </div>
    </section>
  );
};
