import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Badge from "../../components/common/Badge.jsx";

const settings = [
  ["JWT token management", "Active"],
  ["Role-based access control", "Active"],
  ["Data encryption placeholder", "Planned"],
  ["Two-factor authentication", "Ready"],
  ["Secure cloud backup", "Ready"],
  ["GDPR compliance page", "Ready"],
  ["Firewall protection", "Planned"],
  ["API rate limiting", "Active"],
];

export default function Security() {
  return (
    <>
      <PageHeader title="Security settings" description="Authentication, compliance, API security, audit controls, and resilience placeholders." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {settings.map(([title, state]) => (
          <Card key={title} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-slate-950">{title}</h2>
              <Badge tone={state === "Active" ? "green" : state === "Ready" ? "blue" : "amber"}>{state}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-500">Configurable from backend environment and admin policy controls.</p>
          </Card>
        ))}
      </div>
    </>
  );
}
