// Shared client-side helpers for server-driven tables (search/filter/sort/pagination
// expressed as URL query params, re-fetched via full navigation). Used by the Sessions
// and Roster pages, which query the DB directly rather than filtering/sorting rows
// already in the DOM — necessary once a table has more than one page of data.

type ParamUpdates = Record<string, string | null | undefined>;

export function updateQueryParams(updates: ParamUpdates, opts: { resetPage?: boolean } = {}): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === '' || value === 'ALL') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  }
  if (opts.resetPage !== false) {
    url.searchParams.delete('page');
  }
  window.location.href = url.toString();
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Wires click handlers on `th.sortable[data-sort-key]` headers to navigate with
// updated sort/dir params. The active header's sorted-asc/desc class is expected to
// already be server-rendered from the current URL state — this only handles the click.
export function initServerSort(defaultSort: string, defaultDir: 'asc' | 'desc' = 'desc'): void {
  const params = new URLSearchParams(window.location.search);
  const currentSort = params.get('sort') || defaultSort;
  const currentDir = params.get('dir') === 'asc' ? 'asc' : (params.get('dir') === 'desc' ? 'desc' : defaultDir);

  document.querySelectorAll<HTMLTableCellElement>('th.sortable[data-sort-key]').forEach(header => {
    const key = header.getAttribute('data-sort-key');
    if (!key) return;
    header.addEventListener('click', () => {
      const nextDir = key === currentSort && currentDir === 'asc' ? 'desc' : 'asc';
      updateQueryParams({ sort: key, dir: nextDir });
    });
  });
}
