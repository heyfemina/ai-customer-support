import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import { unwrapData } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";

const languageOptions = [
  { code: "en", nameKey: "aiSettings.languages.en", regionKey: "aiSettings.regions.en", previewKey: "aiSettings.previews.en" },
  { code: "it", nameKey: "aiSettings.languages.it", regionKey: "aiSettings.regions.it", previewKey: "aiSettings.previews.it" },
  { code: "es", nameKey: "aiSettings.languages.es", regionKey: "aiSettings.regions.es", previewKey: "aiSettings.previews.es" },
  { code: "fr", nameKey: "aiSettings.languages.fr", regionKey: "aiSettings.regions.fr", previewKey: "aiSettings.previews.fr" },
];

const providerModelDefaults = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
};

const defaultSettings = {
  botName: "Support AI",
  apiProvider: "gemini",
  model: "gemini-2.5-flash",
  apiKey: "",
  apiKeyEnabled: false,
  hasApiKey: false,
  welcomeMessage: "Hello, I can help with tickets, account questions, and quick troubleshooting.",
  fallbackMessage: "I will transfer you to an agent so we can resolve this properly.",
  isActive: true,
  autoTranslate: true,
  handoffAfterFailedReplies: 2,
  supportedLanguages: ["en", "it", "es", "fr"],
  regionalNotes: "",
  regionalProfiles: {},
};

export default function AISettings() {
  const { t } = useTranslation();
  const [form, setForm] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/ai/settings").then(({ data }) => {
      const settings = unwrapData(data);
      if (settings) {
        setForm({
          ...defaultSettings,
          ...settings,
          apiKey: "",
          removeApiKey: false,
          regionalProfiles: {
            ...(defaultSettings.regionalProfiles || {}),
            ...(settings.regionalProfiles || {}),
          },
        });
      }
    }).catch(() => setForm(defaultSettings));
  }, []);

  const save = async () => {
    if (!form.botName?.trim()) {
      setError(t("aiSettings.validation.botNameRequired"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await api.put("/ai/settings", form);
      const saved = unwrapData(data);
      if (saved) setForm({ ...form, ...saved, apiKey: "", removeApiKey: false });
    } catch (error) {
      setError(error.friendlyMessage || "Unable to save AI settings.");
    } finally {
      setNotice(t("aiSettings.notices.saved"));
      setSaving(false);
    }
  };

  const toggleLanguage = (code) => {
    const current = form.supportedLanguages || [];
    const supportedLanguages = current.includes(code) ? current.filter((item) => item !== code) : [...current, code];
    setForm({ ...form, supportedLanguages });
  };

  const updateRegionalProfile = (code, value) => {
    setForm({
      ...form,
      regionalProfiles: {
        ...(form.regionalProfiles || {}),
        [code]: value,
      },
    });
  };

  const updateProvider = (apiProvider) => {
    setForm({
      ...form,
      apiProvider,
      model: providerModelDefaults[apiProvider] || form.model || "",
    });
  };

  return (
    <>
      <PageHeader title="AI configuration settings" description="Tune bot identity, fallback behavior, translation, summarization, and human transfer rules." actions={<Button loading={saving} onClick={save}>{t("aiSettings.actions.save")}</Button>} />
      <Card className="p-5">
        {notice ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p> : null}
        {error ? <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block"><span className="text-sm font-semibold text-slate-700">{t("aiSettings.fields.botName")}</span><input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.botName || ""} onChange={(event) => setForm({ ...form, botName: event.target.value })} /></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">{t("aiSettings.fields.aiActive")}</span><select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={String(Boolean(form.isActive))} onChange={(event) => setForm({ ...form, isActive: event.target.value === "true" })}><option value="true">{t("aiSettings.states.enabled")}</option><option value="false">{t("aiSettings.states.disabled")}</option></select></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">AI provider</span><select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.apiProvider || "gemini"} onChange={(event) => updateProvider(event.target.value)}><option value="gemini">Gemini</option><option value="openai">OpenAI</option></select></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">Model</span><input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.model || providerModelDefaults[form.apiProvider || "gemini"]} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">API key</span><input type="password" className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.apiKey || ""} onChange={(event) => setForm({ ...form, apiKey: event.target.value, removeApiKey: false })} placeholder={form.hasApiKey ? `Saved key ${form.apiKeyMasked || ""}` : "Paste provider API key"} /></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">API key status</span><select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={String(Boolean(form.apiKeyEnabled))} onChange={(event) => setForm({ ...form, apiKeyEnabled: event.target.value === "true" })}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
          {form.hasApiKey ? <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700"><span>Remove saved API key {form.apiKeyMasked || ""}</span><input type="checkbox" checked={Boolean(form.removeApiKey)} onChange={(event) => setForm({ ...form, removeApiKey: event.target.checked, apiKey: "" })} /></label> : null}
          <label className="block"><span className="text-sm font-semibold text-slate-700">{t("aiSettings.fields.aiTranslationSupport")}</span><select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={String(Boolean(form.autoTranslate))} onChange={(event) => setForm({ ...form, autoTranslate: event.target.value === "true" })}><option value="true">{t("aiSettings.states.enabled")}</option><option value="false">{t("aiSettings.states.disabled")}</option></select></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">{t("aiSettings.fields.handoffAfterFailedReplies")}</span><input type="number" min="1" max="5" className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.handoffAfterFailedReplies || 2} onChange={(event) => setForm({ ...form, handoffAfterFailedReplies: Number(event.target.value) })} /></label>
          <label className="block lg:col-span-2"><span className="text-sm font-semibold text-slate-700">{t("aiSettings.fields.welcomeMessage")}</span><textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2" value={form.welcomeMessage || ""} onChange={(event) => setForm({ ...form, welcomeMessage: event.target.value })} /></label>
          <label className="block lg:col-span-2"><span className="text-sm font-semibold text-slate-700">{t("aiSettings.fields.fallbackMessage")}</span><textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2" value={form.fallbackMessage || ""} onChange={(event) => setForm({ ...form, fallbackMessage: event.target.value })} /></label>
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold text-slate-700">{t("aiSettings.sections.languageCoverage")}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {languageOptions.map(({ code, nameKey, previewKey }) => (
                <label key={code} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                  <span><span className="block">{t(nameKey)}</span><span className="text-xs font-medium text-slate-500">{t(previewKey)}</span></span>
                  <input type="checkbox" checked={(form.supportedLanguages || []).includes(code)} onChange={() => toggleLanguage(code)} />
                </label>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold text-slate-700">{t("aiSettings.sections.regionalCustomization")}</p>
            <div className="mt-2 grid gap-3 lg:grid-cols-2">
              {languageOptions.map(({ code, nameKey, regionKey }) => (
                <label key={code} className="block rounded-md border border-slate-200 p-3">
                  <span className="text-sm font-semibold text-slate-700">{t("aiSettings.fields.regionalProfile", { language: t(nameKey) })}</span>
                  <input className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={form.regionalProfiles?.[code] || t(regionKey)} onChange={(event) => updateRegionalProfile(code, event.target.value)} />
                </label>
              ))}
            </div>
          </div>
          <label className="block lg:col-span-2"><span className="text-sm font-semibold text-slate-700">{t("aiSettings.fields.regionalNotes")}</span><textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2" placeholder={t("aiSettings.placeholders.regionalNotes")} value={form.regionalNotes || ""} onChange={(event) => setForm({ ...form, regionalNotes: event.target.value })} /></label>
        </div>
      </Card>
    </>
  );
}
