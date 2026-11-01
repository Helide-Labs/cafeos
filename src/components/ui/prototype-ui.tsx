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

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="demo-toast"><span>✓</span>{message}<button onClick={onClose}>×</button></div>;
}

function formatChartValue(value: number) {
  if (!Number.isFinite(value) || value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const scaled = Math.round((value / 1000) * 10) / 10;
    const text = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1);
    return `${text}k`;
  }
  return Math.round(value).toLocaleString("en-US");
}

export function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="bar-chart" aria-label="Bar chart">
      {values.map((value, index) => (
        <div className="bar-column" key={`${labels[index]}-${index}`}>
          <span className="bar-value">{formatChartValue(value)}</span>
          <div className="bar-rail"><i className={value === 0 ? "is-zero" : undefined} style={{ height: value === 0 ? "0%" : `${(value / max) * 100}%` }} /></div>
          <span>{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}
