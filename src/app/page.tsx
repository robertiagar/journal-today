import { Journal } from "../components/journal";

import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-5xl px-6 py-12 text-sm text-muted">Opening your journal…</main>}>
      <Journal />
    </Suspense>
  );
}
