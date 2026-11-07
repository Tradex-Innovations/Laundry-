import type { SVGProps } from "react";

export type LinenIconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  size?: number | string;
  duotone?: boolean;
};

function IconCanvas({ size = 24, strokeWidth = 1.8, children, ...props }: Omit<LinenIconProps, "duotone">) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{children}</svg>;
}

/* The same geometry works as a quiet outline in navigation and a two-tone tile. */
export function LinenInIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <path d="M3 10h18l-1.5 10h-15L3 10Z" fill="currentColor" fillOpacity=".16" stroke="none" />}
    <path d="M3 10h4m10 0h4l-1.5 10h-15L3 10m3 0V6h2m8 0h2v4M12 2v11m-3-3 3 3 3-3M8 15v2m4-1v2m4-3v2" />
  </IconCanvas>;
}

export function LinenOutIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <g fill="currentColor" fillOpacity=".16" stroke="none"><rect x="3" y="14" width="18" height="6" rx="2" /><rect x="4" y="8" width="13" height="6" rx="2" /></g>}
    <rect x="3" y="14" width="18" height="6" rx="2" />
    <path d="M7 17h11M16 8H6a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2m1-3h6M19 2l.9 2.6L22 5.5l-2.1.9L19 9l-.9-2.6-2.1-.9 2.1-.9L19 2Z" />
  </IconCanvas>;
}

export function DeliveryTruckIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <g fill="currentColor" fillOpacity=".16" stroke="none"><path d="M2 5h12v12H2zM14 9h4l4 5v3h-8z" /></g>}
    <path d="M4 17H2V5h12v12H8m10 0h-4V9h4l4 5v3h-1M14 14h8M5 9h5" />
    <circle cx="6" cy="17" r="2" /><circle cx="19" cy="17" r="2" />
  </IconCanvas>;
}

export function ManifestIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" fill="currentColor" fillOpacity=".14" stroke="none" />}
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 11h5m-5 4 2 2 5-5M8 19h8" />
  </IconCanvas>;
}

export function ReceivingRecordsIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <rect x="4" y="4" width="16" height="18" rx="2" fill="currentColor" fillOpacity=".14" stroke="none" />}
    <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M12 9v6m-3-3 3 3 3-3M8 19h8" />
  </IconCanvas>;
}

export function DispatchHistoryIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity=".14" stroke="none" />}
    <path d="M3 7v5h5M3.5 7.5a9 9 0 1 1 .2 9M12 7v5l3 2" />
  </IconCanvas>;
}

export function PackedCartIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <path d="M5 9h16l-2 8H7L5 9Z" fill="currentColor" fillOpacity=".16" stroke="none" />}
    <path d="M2 3h2l3 14h12l2-8H6m2 0V5h10v4M10 5V3h6v2M10 13h6" />
    <circle cx="9" cy="21" r="1" /><circle cx="18" cy="21" r="1" />
  </IconCanvas>;
}

export function LinenStackIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <g fill="currentColor" fillOpacity=".16" stroke="none"><rect x="3" y="14" width="18" height="6" rx="2" /><rect x="5" y="4" width="14" height="5" rx="2" /></g>}
    <rect x="5" y="4" width="14" height="5" rx="2" />
    <path d="M19 9H6a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h12m-1 0H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2M8 6.5h7M7 17h10" />
  </IconCanvas>;
}

export function BedLinenIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <path d="M4 10h16v9H4z" fill="currentColor" fillOpacity=".16" stroke="none" />}
    <path d="M4 10V4h16v6M2 20v-7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v7M2 17h20M6 10V7h5v3m2 0V7h5v3" />
  </IconCanvas>;
}

export function TowelIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <rect x="5" y="3" width="14" height="18" rx="2" fill="currentColor" fillOpacity=".16" stroke="none" />}
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M5 16h14M5 18.5h14M9 7v5" />
  </IconCanvas>;
}

export function TableLinenIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <path d="m12 3 9 9-9 9-9-9 9-9Z" fill="currentColor" fillOpacity=".16" stroke="none" />}
    <path d="m12 3 9 9-9 9-9-9 9-9Zm0 0v9l9 0M7 12l5 5" />
  </IconCanvas>;
}

export function UniformIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <path d="m8 3-6 4 3 5 2-1v10h10V11l2 1 3-5-6-4H8Z" fill="currentColor" fillOpacity=".16" stroke="none" />}
    <path d="m8 3-6 4 3 5 2-1v10h10V11l2 1 3-5-6-4m-8 0 4 4 4-4M12 7v14M14 11h1" />
  </IconCanvas>;
}

export function KitchenLinenIcon({ duotone = true, ...props }: LinenIconProps) {
  return <IconCanvas {...props}>
    {duotone && <path d="M8 3h8l1 6 3 11H4L7 9l1-6Z" fill="currentColor" fillOpacity=".16" stroke="none" />}
    <path d="M8 3h8l1 6 3 11H4L7 9l1-6Zm1 0v3a3 3 0 0 0 6 0V3M8 12h8v3a4 4 0 0 1-8 0v-3ZM4 9h3m10 0h3" />
  </IconCanvas>;
}
