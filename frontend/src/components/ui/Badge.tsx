type BadgeTone = "success" | "warning" | "neutral" | "danger";

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-status-success-bg text-status-success-text",
  warning: "bg-status-warning-bg text-status-warning-text",
  neutral: "bg-status-neutral-bg text-status-neutral-text",
  danger: "bg-status-danger-bg text-status-danger-text",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
