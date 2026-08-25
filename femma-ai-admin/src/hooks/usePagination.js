import { useEffect, useMemo, useState } from 'react';

/**
 * Simple client-side pagination helper for admin list screens.
 * @param {Array} items - full filtered list
 * @param {number} initialRowsPerPage
 * @param {string|number} resetKey - change this (e.g. search/filters) to jump back to page 0
 */
export default function usePagination(items = [], initialRowsPerPage = 10, resetKey = '') {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(items.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [items.length, rowsPerPage, page]);

  const paginatedItems = useMemo(() => {
    const start = page * rowsPerPage;
    return items.slice(start, start + rowsPerPage);
  }, [items, page, rowsPerPage]);

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return {
    page,
    rowsPerPage,
    paginatedItems,
    handleChangePage,
    handleChangeRowsPerPage,
    count: items.length
  };
}
