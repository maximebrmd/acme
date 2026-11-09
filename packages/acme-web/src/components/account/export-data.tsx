import { Button } from "acme-ui/components/button";
import { useTranslations } from "next-intl";

// The right of access: a JSON file of everything Acme keeps about the user,
// which the server answers as a download, with the visitor's session.
export const ExportData = () => {
  const t = useTranslations("AccountSettings.export");

  return (
    <div>
      <Button
        variant="outline"
        nativeButton={false}
        render={
          <a href="/api/me/export" download>
            {t("download")}
          </a>
        }
      />
    </div>
  );
};
