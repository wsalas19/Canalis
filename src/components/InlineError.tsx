import { AlertTriangle, RefreshCw } from "lucide-react";
import { useT } from "../i18n";
import "./InlineError.css";

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * One-line error row shared by settings panels. Keeps the failing surface in
 * place and offers a retry only when the caller knows how to repeat the work.
 */
export function InlineError({ message, onRetry, retryLabel, className }: InlineErrorProps) {
  const t = useT();
  return (
    <div className={`inline-error${className ? ` ${className}` : ""}`} role="alert">
      <AlertTriangle size={12} strokeWidth={2} className="inline-error-icon" />
      <span className="inline-error-text">{message}</span>
      {onRetry && (
        <button type="button" className="inline-error-retry" onClick={onRetry}>
          <RefreshCw size={10} strokeWidth={2} />
          {retryLabel ?? t("common.retry")}
        </button>
      )}
    </div>
  );
}
