import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import { unwrapData } from "../../utils/helpers.js";

export default function AISettings() {
  const [form, setForm] = useState({ botName: "Support AI", welcomeMessage: "", fallbackMessage: "", isActive: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/ai/settings").then(({ data }) => {
      const settings = unwrapData(data);
      if (settings) setForm(settings);
    }).catch(() => null);
  }, []);

  const save = async () => {
    setSaving(true);
    await api.put("/ai/settings", {
      botName: form.botName,
      welcomeMessage: form.welcomeMessage,
      fallbackMessage: form.fallbackMessage,
      isActive: form.isActive,
    }).finally(() => setSaving(false));
  };

  return (
    <>
      <PageHeader title="AI configuration settings" description="Tune bot identity, fallback behavior, translation, summarization, and human transfer rules." actions={<Button loading={saving} onClick={save}>Save settings</Button>} />
      <Card className="p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block"><span className="text-sm font-semibold text-slate-700">Bot name</span><input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.botName || ""} onChange={(event) => setForm({ ...form, botName: event.target.value })} /></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">AI active</span><select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={String(Boolean(form.isActive))} onChange={(event) => setForm({ ...form, isActive: event.target.value === "true" })}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
          <label className="block lg:col-span-2"><span className="text-sm font-semibold text-slate-700">Welcome message</span><textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2" value={form.welcomeMessage || ""} onChange={(event) => setForm({ ...form, welcomeMessage: event.target.value })} /></label>
          <label className="block lg:col-span-2"><span className="text-sm font-semibold text-slate-700">Fallback message</span><textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2" value={form.fallbackMessage || ""} onChange={(event) => setForm({ ...form, fallbackMessage: event.target.value })} /></label>
        </div>
      </Card>
    </>
  );
}
