import { useState } from "react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import { demoStore } from "../../utils/demoStore.js";

export default function Security() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(demoStore.security());
  const [notice, setNotice] = useState("");
  const toggle = (id) => {
    const next = settings.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item);
    setSettings(demoStore.saveSecurity(next));
    demoStore.addActivityLog(`${settings.find((item) => item.id === id)?.title} ${settings.find((item) => item.id === id)?.enabled ? "disabled" : "enabled"}`);
    setNotice("Security policy updated.");
  };

  const runAction = (action) => {
    demoStore.addActivityLog(action);
    setNotice(action);
  };

  return (
    <>
      <PageHeader title="Security settings" description="Authentication, compliance, API security, audit controls, and resilience placeholders." />
      {notice ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p> : null}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Button variant="secondary" onClick={() => runAction("Secure cloud backup completed")}>{t("security.actions.backup")}</Button>
        <Button variant="secondary" onClick={() => runAction("GDPR data export prepared")}>{t("security.actions.gdprExport")}</Button>
        <Button variant="secondary" onClick={() => runAction("Firewall and API security check passed")}>{t("security.actions.securityCheck")}</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {settings.map(({ id, title, state, enabled, detail }) => (
          <Card key={id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-slate-950">{t(`security.items.${id}.title`, { defaultValue: title })}</h2>
              <Badge tone={state === "Active" ? "green" : state === "Ready" ? "blue" : "amber"}>{t(`security.states.${state}`, { defaultValue: state })}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-500">{t(`security.items.${id}.detail`, { defaultValue: detail || "Configurable from backend environment and admin policy controls." })}</p>
            <Button variant={enabled ? "secondary" : "primary"} className="mt-4 w-full" onClick={() => toggle(id)}>
              {enabled ? t("security.enabled") : t("security.enable")}
            </Button>
          </Card>
        ))}
      </div>
    </>
  );
}
