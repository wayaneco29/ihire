type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
};

export async function getAllSupabaseRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000,
) {
  const firstPage = await fetchPage(0, pageSize - 1);
  if (firstPage.error) return { data: null, error: firstPage.error };

  const rows = [...(firstPage.data ?? [])];
  const totalCount = firstPage.count ?? rows.length;
  const remainingOffsets = Array.from(
    { length: Math.ceil(Math.max(0, totalCount - rows.length) / pageSize) },
    (_, index) => (index + 1) * pageSize,
  );
  const remainingPages = await Promise.all(
    remainingOffsets.map((offset) => fetchPage(offset, offset + pageSize - 1)),
  );
  const error = remainingPages.find((page) => page.error)?.error ?? null;
  if (error) return { data: null, error };

  rows.push(...remainingPages.flatMap((page) => page.data ?? []));
  return { data: rows, error: null };
}
