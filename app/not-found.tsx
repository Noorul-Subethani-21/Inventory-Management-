import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="text-[13px] font-medium text-accent">404</p>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-navy">This page is not in the workspace</h1>
      <p className="mt-2 text-[13px] text-slate-500">The link may be outdated, or the record has moved.</p>
      <Link href="/dashboard" className="mt-6 inline-flex h-9 items-center rounded-lg bg-navy px-3 text-[13px] font-medium text-white">
        Back to overview
      </Link>
    </div>
  );
}
