import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-8 sm:px-6">
      <div className="w-full max-w-[880px]">
        <Outlet />
      </div>
    </main>
  );
}
