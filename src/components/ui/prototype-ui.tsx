"use client";

import { X } from "lucide-react";

export function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`status-badge status-${tone.toLowerCase().replaceAll(" ", "-")}`}>{children}</span>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="module-header">
      <div>{eyebrow && <p className="module-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="module-actions">{actions}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className={`modal-panel ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2><button onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function DemoToast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="demo-toast"><span>✓</span>{message}<button onClick={onClose}>×</button></div>;
}

export function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values);
  return (
    <div className="bar-chart" aria-label="Bar chart">
      {values.map((value, index) => (
        <div className="bar-column" key={`${labels[index]}-${value}`}>
          <span className="bar-value">{value}k</span>
          <div className="bar-rail"><i style={{ height: `${(value / max) * 100}%` }} /></div>
          <span>{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}
