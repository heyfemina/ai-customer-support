import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import Badge from "../../components/common/Badge.jsx";
import { normalizeItems } from "../../utils/helpers.js";

const integrations = [
  ["WhatsApp API", "Business number, webhook URL, access token, template sync"],
  ["Website chatbot", "Embed key, domains, AI handoff trigger, visitor tracking"],
  ["Email system", "SMTP host, sender address, test mail, ticket ingestion"],
];

export default function Integrations() {
  const [items, setItems] = useState(integrations.map(([title, text]) => ({ title, text, isActive: false })));
  useEffect(() => {
    api.get("/integrations").then(({ data }) => {
      const rows = normalizeItems(data, []);
      if (rows.length) {
        setItems(rows.map((row) => ({
          title: row.type,
          text: JSON.stringify(row.config),
          isActive: row.isActive,
        })));
      }
    }).catch(() => null);
  }, []);

  return (
    <>
      <PageHeader title="Integration settings" description="Configure WhatsApp, website chatbot, and email support channels." />
      <div className="grid gap-4 lg:grid-cols-3">
        {items.map(({ title, text, isActive }) => (
          <Card key={title} className="p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">{title}</h2><Badge tone={isActive ? "green" : "slate"}>{isActive ? "Active" : "Inactive"}</Badge></div>
            <p className="mt-2 text-sm text-slate-500">{text}</p>
            <div className="mt-5 space-y-3">
              <input className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" placeholder="API key or webhook URL" />
              <Button variant="secondary" className="w-full">Test connection</Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
