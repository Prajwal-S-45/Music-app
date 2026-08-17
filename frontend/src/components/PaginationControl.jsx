import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

function PaginationControl({ currentPage = 1, totalPages = 1, onPageChange, isLoading = false }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
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
        Page <span className="pagination-highlight">{currentPage}</span> of{' '}
        <span className="pagination-highlight">{totalPages}</span>
      </div>

      <div className="pagination-buttons-bar">
        {/* First page */}
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || isLoading}
          title="First Page"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous page */}
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          title="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((p) => (
          <button
            key={p}
            type="button"
            className={`pagination-number-btn ${p === currentPage ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
            disabled={isLoading}
          >
            {p}
          </button>
        ))}

        {/* Next page */}
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          title="Next Page"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last page */}
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || isLoading}
          title="Last Page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default PaginationControl;
