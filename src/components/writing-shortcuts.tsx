const shortcuts = [
  { syntax: "# + space", description: "for a heading" },
  { syntax: "**a thought**", description: "for bold" },
  { syntax: "- + space", description: "for a list" },
  { syntax: "> + space", description: "for a quote" },
  { syntax: "*a thought*", description: "for italic" },
  { syntax: "`a thought`", description: "for code" },
];

export function WritingShortcuts() {
  return (
    <details className="mt-7 text-xs text-muted">
      <summary className="w-fit cursor-pointer rounded-sm py-1 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        A few writing shortcuts
      </summary>
      <div className="mt-4 grid gap-3 rounded-lg border border-line bg-surface p-4 leading-5 sm:grid-cols-2">
        {shortcuts.map(({ syntax, description }) => (
          <span key={syntax}>
            <code>{syntax}</code> {description}
          </span>
        ))}
        <p className="border-t border-line pt-3 sm:col-span-2">
          Write or paste Markdown and it formats as you go. Your pages stay in
          this browser. When midnight arrives, the new date stays with the
          paragraph you’re writing.
        </p>
      </div>
    </details>
  );
}
