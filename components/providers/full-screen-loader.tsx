export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground"
        aria-label="Caricamento"
      />
    </div>
  );
}
