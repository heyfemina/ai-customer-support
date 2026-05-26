import { Link } from "react-router-dom";
import Button from "../../components/common/Button.jsx";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
      <div>
        <h1 className="text-5xl font-bold text-slate-950">404</h1>
        <p className="mt-3 text-slate-500">This page does not exist.</p>
        <Link className="mt-6 inline-block" to="/"><Button>Go home</Button></Link>
      </div>
    </div>
  );
}
