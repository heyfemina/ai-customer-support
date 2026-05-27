import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import { unwrapData } from "../../utils/helpers.js";
import { demoStore } from "../../utils/demoStore.js";

const languageOptions = [
  { code: "en", name: "English", region: "US English, concise support tone", preview: "How can we help you today?" },
  { code: "it", name: "Italian", region: "Italian, formal billing tone", preview: "Come possiamo aiutarla oggi?" },
  { code: "es", name: "Spanish", region: "Spanish, neutral regional tone", preview: "Como podemos ayudarte hoy?" },
  { code: "fr", name: "French", region: "French, polite complaint handling", preview: "Comment pouvons-nous vous aider aujourd'hui ?" },
];

export default function AISettings() {
  const [form, setForm] = useState(demoStore.aiSettings());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/ai/settings").then(({ data }) => {
      const settings = unwrapData(data);
      if (settings) setForm(settings);
    }).catch(() => setForm(demoStore.aiSettings()));
  }, []);

  const save = async () => {
    if (!form.botName?.trim()) {
      setError("Bot name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.put("/ai/settings", form);
    } catch {
      demoStore.saveAiSettings(form);
    } finally {
      setNotice("Settings saved");
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

  return (
    <>
      <PageHeader title="AI configuration settings" description="Tune bot identity, fallback behavior, translation, summarization, and human transfer rules." actions={<Button loading={saving} onClick={save}>Save settings</Button>} />
      <Card className="p-5">
        {notice ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p> : null}
        {error ? <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block"><span className="text-sm font-semibold text-slate-700">Bot name</span><input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.botName || ""} onChange={(event) => setForm({ ...form, botName: event.target.value })} /></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">AI active</span><select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={String(Boolean(form.isActive))} onChange={(event) => setForm({ ...form, isActive: event.target.value === "true" })}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">AI translation support</span><select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={String(Boolean(form.autoTranslate))} onChange={(event) => setForm({ ...form, autoTranslate: event.target.value === "true" })}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">Agent transfer after failed replies</span><input type="number" min="1" max="5" className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.handoffAfterFailedReplies || 2} onChange={(event) => setForm({ ...form, handoffAfterFailedReplies: Number(event.target.value) })} /></label>
          <label className="block lg:col-span-2"><span className="text-sm font-semibold text-slate-700">Welcome message</span><textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2" value={form.welcomeMessage || ""} onChange={(event) => setForm({ ...form, welcomeMessage: event.target.value })} /></label>
          <label className="block lg:col-span-2"><span className="text-sm font-semibold text-slate-700">Fallback message</span><textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2" value={form.fallbackMessage || ""} onChange={(event) => setForm({ ...form, fallbackMessage: event.target.value })} /></label>
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold text-slate-700">Language coverage</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {languageOptions.map(({ code, name, preview }) => (
                <label key={code} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                  <span><span className="block">{name}</span><span className="text-xs font-medium text-slate-500">{preview}</span></span>
                  <input type="checkbox" checked={(form.supportedLanguages || []).includes(code)} onChange={() => toggleLanguage(code)} />
                </label>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold text-slate-700">Regional language customization</p>
            <div className="mt-2 grid gap-3 lg:grid-cols-2">
              {languageOptions.map(({ code, name, region }) => (
                <label key={code} className="block rounded-md border border-slate-200 p-3">
                  <span className="text-sm font-semibold text-slate-700">{name} regional profile</span>
                  <input className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={form.regionalProfiles?.[code] || region} onChange={(event) => updateRegionalProfile(code, event.target.value)} />
                </label>
              ))}
            </div>
          </div>
          <label className="block lg:col-span-2"><span className="text-sm font-semibold text-slate-700">Regional customization notes</span><textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2" placeholder="Example: Use formal Italian for billing, concise English for technical support." value={form.regionalNotes || ""} onChange={(event) => setForm({ ...form, regionalNotes: event.target.value })} /></label>
        </div>
      </Card>
    </>
  );
}
