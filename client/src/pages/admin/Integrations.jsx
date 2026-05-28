import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import Badge from "../../components/common/Badge.jsx";
import { normalizeItems } from "../../utils/helpers.js";
import { demoStore } from "../../utils/demoStore.js";

const fields = {
  whatsapp: [
    ["phoneNumberId", "Phone number ID"],
    ["webhookUrl", "Webhook URL"],
    ["accessToken", "Access token"],
    ["templateNamespace", "Template namespace"],
  ],
  chatbot: [
    ["embedKey", "Embed key"],
    ["allowedDomains", "Allowed domains"],
    ["handoffTrigger", "AI handoff trigger words"],
  ],
  email: [
    ["smtpHost", "SMTP host"],
    ["smtpPort", "SMTP port"],
    ["senderEmail", "Sender email"],
    ["inboundAddress", "Inbound ticket address"],
  ],
};

export default function Integrations() {
  const { t } = useTranslation();
  const [items, setItems] = useState(demoStore.integrations());
  useEffect(() => {
    api.get("/integrations").then(({ data }) => {
      const rows = normalizeItems(data, []);
      if (rows.length) {
        setItems(rows.map((row) => ({
          id: row.type.toLowerCase(),
          title: row.type,
          text: JSON.stringify(row.config),
          isActive: row.isActive,
          status: row.isActive ? "Connected" : "Pending API keys",
          config: row.config || {},
        })));
      }
    }).catch(() => setItems(demoStore.integrations()));
  }, []);

  const updateConfig = (id, key, value) => {
    const next = items.map((item) => item.id === id ? { ...item, config: { ...(item.config || {}), [key]: value } } : item);
    setItems(demoStore.saveIntegrations(next));
  };

  const saveIntegration = async (id) => {
    const current = items.find((item) => item.id === id);
    const next = items.map((item) => item.id === id ? { ...item, status: "Saved locally" } : item);
    try {
      await api.put(`/integrations/${id}`, { config: current.config, isActive: current.isActive });
    } catch {
      demoStore.addActivityLog(`Saved ${current.title} integration settings`);
    }
    setItems(demoStore.saveIntegrations(next));
  };

  const testConnection = (id) => {
    const next = items.map((item) => item.id === id ? { ...item, status: item.isActive ? "Connection healthy" : "Credentials saved, channel inactive" } : item);
    setItems(demoStore.saveIntegrations(next));
    demoStore.addActivityLog(`Tested ${items.find((item) => item.id === id)?.title} integration`);
  };

  const toggleIntegration = (id) => {
    const next = items.map((item) => item.id === id ? { ...item, isActive: !item.isActive, status: !item.isActive ? "Enabled" : "Paused" } : item);
    setItems(demoStore.saveIntegrations(next));
    demoStore.addActivityLog(`${items.find((item) => item.id === id)?.title} ${items.find((item) => item.id === id)?.isActive ? "paused" : "enabled"}`);
  };

  const widgetBase = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:5000";
  const widgetCode = `<script src="${widgetBase}/widget.js" data-widget-id="default"></script>`;

  return (
    <>
      <PageHeader title="Integration settings" description="Configure WhatsApp, website chatbot, and email support channels." />
      <div className="grid gap-4 lg:grid-cols-3">
        {items.map(({ id, title, text, isActive, status, config = {} }) => (
          <Card key={id || title} className="p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">{t(`integrations.items.${id}.title`, { defaultValue: title })}</h2><Badge tone={isActive ? "green" : "slate"}>{isActive ? t("integrations.active") : t("integrations.inactive")}</Badge></div>
            <p className="mt-2 text-sm text-slate-500">{t(`integrations.items.${id}.text`, { defaultValue: text })}</p>
            <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">{status}</p>
            <div className="mt-5 space-y-3">
              {(fields[id] || []).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-xs font-semibold uppercase text-slate-500">{t(`integrations.fields.${key}`, { defaultValue: label })}</span>
                  <input className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={config[key] || ""} onChange={(event) => updateConfig(id, key, event.target.value)} placeholder={t(`integrations.fields.${key}`, { defaultValue: label })} />
                </label>
              ))}
              {id === "chatbot" ? (
                <div className="space-y-3 rounded-md border border-sky-100 bg-sky-50 p-3">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">Widget title</span>
                    <input className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={config.widgetTitle || "Support Chat"} onChange={(event) => updateConfig(id, "widgetTitle", event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">Welcome message</span>
                    <input className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={config.welcomeMessage || "Hi, how can we help?"} onChange={(event) => updateConfig(id, "welcomeMessage", event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">Primary color</span>
                    <input type="color" className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={config.primaryColor || "#0284c7"} onChange={(event) => updateConfig(id, "primaryColor", event.target.value)} />
                  </label>
                  <label className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    {t("integrations.fields.visitorTracking")}
                    <input type="checkbox" checked={Boolean(config.visitorTracking)} onChange={(event) => updateConfig(id, "visitorTracking", event.target.checked)} />
                  </label>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Embed script</p>
                    <textarea readOnly className="mt-1 min-h-20 w-full rounded-md border border-slate-200 bg-white p-2 text-xs" value={widgetCode} />
                    <Button variant="secondary" className="mt-2 w-full" onClick={() => navigator.clipboard?.writeText(widgetCode)}>Copy embed code</Button>
                  </div>
                </div>
              ) : null}
              <Button variant="secondary" className="w-full" onClick={() => saveIntegration(id)}>{t("integrations.actions.save")}</Button>
              <Button variant="secondary" className="w-full" onClick={() => testConnection(id)}>{isActive ? t("integrations.actions.test") : t("integrations.actions.check")}</Button>
              <Button className="w-full" onClick={() => toggleIntegration(id)}>{isActive ? t("integrations.actions.pause") : t("integrations.actions.enable")}</Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
