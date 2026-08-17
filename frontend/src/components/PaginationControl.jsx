import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

function PaginationControl({ currentPage = 1, totalPages = 1, onPageChange, isLoading = false }) {
  if (totalPages <= 1) return null;

  const normalizedPage = Math.min(totalPages, Math.max(1, Number(currentPage) || 1));

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, normalizedPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="pagination-controls-wrapper">
      <div className="pagination-info">
        Page <span className="pagination-highlight">{normalizedPage}</span> of{' '}
        <span className="pagination-highlight">{totalPages}</span>
      </div>

      <div className="pagination-buttons-bar">
        {/* First page */}
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={normalizedPage === 1 || isLoading}
          title="First Page"
          aria-label="First Page"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous page */}
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(normalizedPage - 1)}
          disabled={normalizedPage === 1 || isLoading}
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((p) => (
          <button
            key={p}
            type="button"
            className={`pagination-number-btn ${p === normalizedPage ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
            disabled={isLoading}
            aria-label={`Page ${p}`}
            aria-current={p === normalizedPage ? 'page' : undefined}
          >
            {p}
          </button>
        ))}

        {/* Next page */}
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(normalizedPage + 1)}
          disabled={normalizedPage === totalPages || isLoading}
          title="Next Page"
          aria-label="Next Page"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last page */}
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={normalizedPage === totalPages || isLoading}
          title="Last Page"
          aria-label="Last Page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default PaginationControl;
