import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react';
import { Pagination, type PaginationData } from './pagination';

const TableContext = React.createContext<{
  isEmpty: boolean;
  setIsEmpty: (value: boolean) => void;
}>({ isEmpty: false, setIsEmpty: () => {} });

interface TableProps {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  innerWrapperClassName?: string;
  emptyMessage?: string;
  pagination?: PaginationData;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSize?: boolean;
  noPagination?: boolean;
  minWidth?: string;
}

export const Table: React.FC<TableProps> = ({
  children,
  className = '',
  wrapperClassName = '',
  innerWrapperClassName = '',
  emptyMessage = "No data available",
  pagination,
  onPageChange,
  onPageSizeChange,
  showPageSize = true,
  noPagination = false,
  minWidth = '960px',
}) => {
  const [isEmpty, setIsEmpty] = React.useState(false);

  return (
    <div className={`flex w-full min-w-0 flex-col gap-4 ${wrapperClassName}`}>
      <TableContext.Provider value={{ isEmpty, setIsEmpty }}>
        {isEmpty && (
          <div className="w-full rounded-r1 border border-primary/20 shadow-s1 bg-white">
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-s1 ring-4 ring-white">
                <Inbox className="w-10 h-10 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold  mb-2 tracking-tight">{emptyMessage}</h3>
              <p className=" text-base max-w-sm mx-auto leading-relaxed text-center">
                It looks like there are no items here yet. <br />
                New data will appear here once available.
              </p>
            </div>
          </div>
        )}
        
        <div className={`w-full min-w-0 overflow-x-auto rounded-r1 border border-primary/20 shadow-s1 ${isEmpty ? 'hidden' : ''} ${innerWrapperClassName}`}>
          <table
            className={`w-full border-collapse bg-white ${className}`}
            style={{ minWidth }}
          >
            {children}
          </table>
        </div>
      </TableContext.Provider>

      {!noPagination && pagination && onPageChange && !isEmpty && (
        <Pagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          showPageSize={showPageSize}
        />
      )}
    </div>
  );
};

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '' }) => {
  return (
    <thead className={`rounded-r1 bg-primary p-3 text-white ${className}`}>
      {children}
    </thead>
  );
};

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const TableBody: React.FC<TableBodyProps> = ({ children, className = '' }) => {
  const { setIsEmpty } = React.useContext(TableContext);
  const childCount = React.Children.count(children);

  React.useEffect(() => {
    setIsEmpty(childCount === 0);
  }, [childCount, setIsEmpty]);

  return (
    <tbody className={`${className}`}>
      {children}
    </tbody>
  );
};

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  isHeader?: boolean;
  id?: string;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ children, className = '', onClick, style, isHeader = false, id }, ref) => {
    const height = isHeader ? '50px' : '69px';
    return (
      <tr
        ref={ref}
        id={id}
        className={`transition-all duaration-300 border-b border-secondary last:border-b-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
        style={{ height, ...style }}
      >
        {children}
      </tr>
    );
  }
);

TableRow.displayName = 'TableRow';

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
  width?: string;
  sortable?: boolean;
  sortKey?: string;
  currentSort?: { key: string; order: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
}

export const TableHead: React.FC<TableHeadProps> = ({
  children,
  className = '',
  width,
  sortable = false,
  sortKey,
  currentSort,
  onSort
}) => {
  const isSorted = currentSort?.key === sortKey;
  const sortOrder = isSorted ? currentSort?.order : null;

  const handleClick = () => {
    if (sortable && sortKey && onSort) {
      onSort(sortKey);
    }
  };

  return (
    <th
      className={`px-3 py-2 text-left text-sm font-semibold tracking-wider whitespace-nowrap lg:px-4 ${sortable ? 'cursor-pointer select-none hover:bg-primary/90' : ''} ${className}`}
      style={{ width }}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="inline-flex">
            {!isSorted && <ArrowUpDown className="w-4 h-4 opacity-50" />}
            {isSorted && sortOrder === 'asc' && <ArrowUp className="w-4 h-4" />}
            {isSorted && sortOrder === 'desc' && <ArrowDown className="w-4 h-4" />}
          </span>
        )}
      </div>
    </th>
  );
};

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  width?: string;
}

export const TableCell: React.FC<TableCellProps> = ({ children, className = '', width }) => {
  return (
    <td className={`px-3 py-2 text-sm text-start align-middle lg:px-4 ${className}`} style={{ width }}>
      {children}
    </td>
  );
};
