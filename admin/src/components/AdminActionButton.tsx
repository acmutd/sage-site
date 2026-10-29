import { Button } from "@sage/ui";
import { useCan, type AdminAction } from "@/access/can";
import { submitSuggestion } from "@/suggestions/submitSuggestion";

interface AdminActionButtonProps {
  action: AdminAction;
  label: string;
  onAction: () => void;
}

// Renders the action for admins, a "Suggest change" for the suggest tier, and nothing otherwise.
export default function AdminActionButton({ action, label, onAction }: AdminActionButtonProps) {
  const permission = useCan()(action);

  if (permission === "denied") return null;
  if (permission === "suggest") {
    return (
      <Button type="button" variant="outline" onClick={() => submitSuggestion({ action })}>
        Suggest change
      </Button>
    );
  }
  return (
    <Button type="button" onClick={onAction}>
      {label}
    </Button>
  );
}
