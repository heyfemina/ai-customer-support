import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";

export default function CustomerProfile() {
  const { user } = useAuth();
  const { language, changeLanguage } = useLanguage();
  return (
    <>
      <PageHeader title="Profile" description="Manage customer details, language, security preferences, and data privacy requests." actions={<Button>Save profile</Button>} />
      <Card className="p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <label><span className="text-sm font-semibold">Name</span><input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" defaultValue={user?.name} /></label>
          <label><span className="text-sm font-semibold">Email</span><input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" defaultValue={user?.email} /></label>
          <label><span className="text-sm font-semibold">Language</span><select value={language} onChange={(event) => changeLanguage(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3"><option value="en">English</option><option value="it">Italian</option><option value="es">Spanish</option><option value="fr">French</option></select></label>
          <label className="flex items-center gap-3 pt-7"><input type="checkbox" className="h-5 w-5" /> <span className="font-semibold">Enable two-factor authentication placeholder</span></label>
        </div>
      </Card>
    </>
  );
}
