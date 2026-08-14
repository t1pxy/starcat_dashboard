"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/** Filter state lives entirely in the URL, so any view is linkable and the
 *  Excel export can be a plain link carrying the same query string. */
export function useQueryUpdater() {
  const router = useRouter();
  // The same bar serves the tables and the charts; changing a filter must keep
  // you on the view you are reading rather than bouncing you to the other one.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = (
    patch: Record<string, string | string[] | null>,
    { replace = false }: { replace?: boolean } = {},
  ) => {
    const next = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(patch)) {
      next.delete(key);
      if (value === null) continue;
      for (const entry of Array.isArray(value) ? value : [value]) {
        if (entry) next.append(key, entry);
      }
    }
    // Any filter change invalidates the current page number.
    next.delete("page");

    const queryString = next.toString();
    startTransition(() => {
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    });
  };

  return { update, searchParams, isPending };
}

/** Multi-value filters travel as repeated params (`?brand=HP&brand=Dell`) but a
 *  hand-written URL may comma-separate them, which the server parser accepts —
 *  so the UI has to read both forms or a chip would go missing. */
export function selectedValues(
  searchParams: URLSearchParams,
  key: string,
): string[] {
  return searchParams
    .getAll(key)
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}
