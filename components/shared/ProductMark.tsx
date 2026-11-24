import { Cable, HardDrive, Headphones, Laptop, Monitor, Mouse, Package, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Peripherals: Mouse,
  Displays: Monitor,
  Audio: Headphones,
  Storage: HardDrive,
  Accessories: Cable,
  Computing: Laptop,
};

export function ProductMark({ category, imageUrl, name }: { category: string; imageUrl?: string; name: string }) {
  if (imageUrl) {
    // User-supplied catalogue URLs are not part of the app's remote image allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className="h-9 w-9 rounded-lg border border-line object-cover" />;
  }
  const Icon = ICONS[category] ?? Package;
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-slate-50 text-slate-500" title={name}>
      <Icon className="h-4 w-4" />
    </span>
  );
}
