import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select } from './select';
import { Button } from './button';
import { Input } from './input';
import { Card } from './card';

export interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PaginationProps {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  className?: string;
}

interface PaginationButtonProps {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  title: string;
}

const PaginationButton: React.FC<PaginationButtonProps> = ({ onClick, disabled, icon, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="inline-flex h-13 w-13 min-w-13 items-center justify-center rounded-r1 border border-primary2 text-primary2 transition-all duration-300 hover:bg-primary2 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent"
    title={title}
  >
    {icon}
  </button>
);

interface PageNumberProps {
  page: number;
  isActive: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  index: number;
}

const PageNumber: React.FC<PageNumberProps> = ({ page, isActive, currentPage, onPageChange }) => {
  const pageNumber = page as number;

  return (
    <Button
      key={pageNumber}
      onClick={() => onPageChange(pageNumber)}
      variant={isActive ? "solid" : "outline"}
      isSquare
      color={isActive ? 'var(--color-secondary)' : 'var(--color-primary2)'}
    >
      {pageNumber}
    </Button>
  );
};

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  className = '',
}) => {
  const { currentPage, totalPages, totalItems, pageSize, hasNextPage, hasPreviousPage } = pagination;
  const [goToPage, setGoToPage] = useState('');

  const fromItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const delta = 2;
    const left = currentPage - delta;
    const right = currentPage + delta;
    const pages: (number | '...')[] = [];

    pages.push(1);

    if (left > 2) pages.push('...');

    for (let i = Math.max(2, left); i <= Math.min(totalPages - 1, right); i++) {
      pages.push(i);
    }

    if (right < totalPages - 1) pages.push('...');

    pages.push(totalPages);

    return pages;
  };

  const pages = getPageNumbers();

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setGoToPage('');
    }
  };

  const handleGoToPageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGoToPage();
    }
  };

  return (
    <Card>
      <div className={`flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between ${className}`}>
        {showPageSize && onPageSizeChange && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap">
                Rows per page:
              </span>
              <div className="w-18">
                <Select
                  value={String(pageSize)}
                  onChange={(value) => onPageSizeChange(Number(value))}
                  options={pageSizeOptions.map(option => ({
                    value: String(option),
                    label: String(option),
                    disabled:
                      (option === 10 && totalItems < 10) ||
                      (option === 20 && totalItems < 10) ||
                      (option === 50 && totalItems <= 20) ||
                      (option === 100 && totalItems <= 50)
                  }))}
                  search={false}
                  disabled={totalItems < 10}
                  size='sm'
                />
              </div>
            </div>

            <span className="text-sm whitespace-nowrap text-primary/60 sm:ml-3">
              Showing <span className="font-semibold text-primary">{fromItem}</span>
              {' – '}
              <span className="font-semibold text-primary">{toItem}</span>
              {' of '}
              <span className="font-semibold text-primary">{totalItems}</span> items
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <PaginationButton
            onClick={() => onPageChange(1)}
            disabled={!hasPreviousPage}
            icon={<ChevronsLeft className="h-4 w-4" />}
            title="First page"
          />

          <PaginationButton
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPreviousPage}
            icon={<ChevronLeft className="h-4 w-4" />}
            title="Previous page"
          />

          <div className="flex flex-wrap items-center justify-center gap-1">
            {pages.map((page, index) =>
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="inline-flex h-13 w-13 min-w-13 items-center justify-center text-primary2 select-none">…</span>
              ) : (
                <PageNumber
                  key={`page-${page}`}
                  page={page}
                  isActive={page === currentPage}
                  currentPage={currentPage}
                  onPageChange={onPageChange}
                  index={index}
                />
              )
            )}
          </div>

          <PaginationButton
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNextPage}
            icon={<ChevronRight className="h-4 w-4" />}
            title="Next page"
          />

          <PaginationButton
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNextPage}
            icon={<ChevronsRight className="h-4 w-4" />}
            title="Last page"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="text-sm whitespace-nowrap">
            Go to page:
          </span>
          <Input
            type="text"
            value={goToPage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoToPage(e.target.value)}
            onKeyDown={handleGoToPageKeyDown}
            isNum={true}
            size="sm"
            disabled={totalPages <= 1}
          />
          <Button
            onClick={handleGoToPage}
            disabled={totalPages <= 1 || !goToPage || parseInt(goToPage, 10) < 1 || parseInt(goToPage, 10) > totalPages}
            isSquare={true}
          >
            Go
          </Button>
        </div>
      </div>
    </Card>
  );
};
