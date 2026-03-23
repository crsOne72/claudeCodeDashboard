export function ModelBadge({ model }: { model: string | null }) {
  if (!model) return null;

  let color = "bg-sonnet/15 text-sonnet border-sonnet/25";
  let label = model;

  if (model.startsWith("claude-opus")) {
    color = "bg-opus/15 text-opus border-opus/25";
    label = "Opus";
  } else if (model.startsWith("claude-sonnet")) {
    color = "bg-sonnet/15 text-sonnet border-sonnet/25";
    label = "Sonnet";
  } else if (model.startsWith("claude-haiku")) {
    color = "bg-haiku/15 text-haiku border-haiku/25";
    label = "Haiku";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}
