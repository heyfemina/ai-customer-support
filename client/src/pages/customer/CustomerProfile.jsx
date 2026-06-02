import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import api from "../../api/axios.js";
import { formatDate } from "../../utils/helpers.js";
import { useEffect, useState } from "react";

const requestTone = {
  PENDING: "amber",
  APPROVED: "blue",
  REJECTED: "red",
  COMPLETED: "green",
};

function requestMessage(request) {
  if (request.status === "PENDING") return "Waiting for admin review.";
  if (request.status === "REJECTED") return request.adminNote || "Request rejected by admin.";
  if (request.status === "COMPLETED") return request.type === "DELETE" ? "Deletion workflow completed." : "Export workflow completed.";
  if (request.type === "EXPORT") return "Approved. Your data export is ready to download.";
  return "Approved. The deletion workflow is awaiting completion by an admin.";
}

function pdfSafeText(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapPdfLine(line, maxLength = 92) {
  if (!line) return [""];
  const chunks = [];
  let remaining = line;
  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf(" ", maxLength);
    if (splitAt < maxLength / 2) splitAt = maxLength;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  chunks.push(remaining);
  return chunks;
}

function createGdprPdf(exportData) {
  const jsonLines = JSON.stringify(exportData, null, 2).split("\n");
  const headerLines = [
    "GDPR Data Export",
    `Generated: ${formatDate(exportData.exportedAt || new Date())}`,
    `Customer: ${exportData.profile?.name || "N/A"} (${exportData.profile?.email || "N/A"})`,
    "",
    "Export data",
  ];
  const lines = [...headerLines, ...jsonLines].flatMap((line) => wrapPdfLine(line));
  const linesPerPage = 48;
  const pages = [];
  for (let index = 0; index < lines.length; index += linesPerPage) pages.push(lines.slice(index, index + linesPerPage));

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  pages.forEach((pageLines, index) => {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const content = [
      "BT",
      "/F1 10 Tf",
      "50 780 Td",
      ...pageLines.map((line) => `(${pdfSafeText(line)}) Tj 0 -14 Td`),
      "ET",
    ].join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

export default function CustomerProfile() {
  const { user } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const [twoFactorOn, setTwoFactorOn] = useState(Boolean(user?.twoFactorOn));
  const [notice, setNotice] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [gdprRequests, setGdprRequests] = useState([]);
  const [gdprLoading, setGdprLoading] = useState(true);

  const loadGdprRequests = async () => {
    setGdprLoading(true);
    try {
      const { data } = await api.get("/gdpr/requests/me");
      setGdprRequests(data.data || []);
    } catch (error) {
      setNotice(error.friendlyMessage || "Unable to load GDPR requests.");
    } finally {
      setGdprLoading(false);
    }
  };

  useEffect(() => {
    loadGdprRequests();
  }, []);

  const toggle2FA = async () => {
    const endpoint = twoFactorOn ? "/auth/disable-2fa" : "/auth/enable-2fa";
    await api.post(endpoint);
    setTwoFactorOn(!twoFactorOn);
    setNotice(`Two-factor authentication ${twoFactorOn ? "disabled" : "enabled"}.`);
  };

  const generateCodes = async () => {
    const { data } = await api.post("/auth/generate-recovery-codes");
    setRecoveryCodes(data.data?.codes || []);
  };

  const requestExport = async () => {
    await api.post("/gdpr/export-request", { reason: "Customer requested data export" });
    setNotice("Data export request submitted.");
    loadGdprRequests();
  };

  const requestDeletion = async () => {
    await api.post("/gdpr/delete-request", { reason: "Customer requested account deletion" });
    setNotice("Account deletion request submitted for admin review.");
    loadGdprRequests();
  };

  const downloadExport = async () => {
    const { data } = await api.get(`/gdpr/export/${user.id}`);
    const exportData = data.data || data;
    const blob = new Blob([createGdprPdf(exportData)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gdpr-export-${user.id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Profile" description="Manage customer details, language, security preferences, and data privacy requests." actions={<Button>Save profile</Button>} />
      {notice ? <p className="mb-4 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{notice}</p> : null}
      <Card className="p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <label><span className="app-label">Name</span><input className="app-field mt-1" defaultValue={user?.name} /></label>
          <label><span className="app-label">Email</span><input className="app-field mt-1" defaultValue={user?.email} /></label>
          <label><span className="app-label">Language</span><select value={language} onChange={(event) => changeLanguage(event.target.value)} className="app-field mt-1"><option value="en">English</option><option value="it">Italian</option><option value="es">Spanish</option><option value="fr">French</option></select></label>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold">Two-factor authentication</p>
            <p className="mt-1 text-sm text-slate-500">Email OTP flow with development OTP display until SMTP is configured.</p>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={toggle2FA}>{twoFactorOn ? "Disable 2FA" : "Enable 2FA"}</Button><Button variant="secondary" onClick={generateCodes}>Generate recovery codes</Button></div>
            {recoveryCodes.length ? <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-mono">{recoveryCodes.map((code) => <p key={code}>{code}</p>)}</div> : null}
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold">Privacy requests</p>
            <p className="mt-1 text-sm text-slate-500">Request export or deletion review under GDPR workflow.</p>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={requestExport}>Request data export</Button><Button variant="secondary" onClick={requestDeletion}>Request account deletion</Button></div>
            <div className="mt-4 space-y-2">
              {gdprLoading ? <p className="text-sm font-semibold text-slate-500">Loading privacy request status...</p> : null}
              {!gdprLoading && !gdprRequests.length ? <p className="text-sm font-semibold text-slate-500">No privacy requests yet.</p> : null}
              {gdprRequests.map((request) => (
                <div key={request.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{request.type === "EXPORT" ? "Data export" : "Account deletion"}</p>
                      <p className="mt-1 text-xs text-slate-500">Requested {formatDate(request.createdAt)}</p>
                    </div>
                    <Badge tone={requestTone[request.status] || "slate"}>{request.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{requestMessage(request)}</p>
                  {request.status === "APPROVED" && request.type === "EXPORT" ? (
                    <Button className="mt-3" variant="secondary" onClick={downloadExport}>Download export</Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
