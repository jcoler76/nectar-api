import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Filter,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { List } from 'react-window';

import { cn } from '../../lib/utils';

import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import { Switch } from './switch';

// Virtual row component that renders a single table row
const VirtualTableRow = ({ index, style, data }) => {
  const { row, columns, onRowClick, renderCell } = data;
  const rowData = row[index];

  return (
    <div
      style={style}
      className="flex items-center border-b border-border/50 hover:bg-muted/30 transition-colors duration-200 cursor-pointer"
      onClick={() => onRowClick?.(rowData)}
    >
      {columns.map((column, colIndex) => (
        <div
          key={column.accessorKey}
          className={cn('flex-1 px-4 py-3 text-sm', column.className, colIndex === 0 && 'pl-6')}
          style={{
            minWidth: column.width ? `${column.width}px` : '150px',
            maxWidth: column.width ? `${column.width}px` : 'none',
          }}
        >
          {renderCell(rowData, column)}
        </div>
      ))}
    </div>
  );
};

// Virtual table header component
const VirtualTableHeader = ({ columns, sortConfig, onSort, getSortIcon }) => (
  <div className="flex items-center bg-muted/20 border-b border-border font-semibold text-sm">
    {columns.map((column, index) => (
      <div
        key={column.accessorKey}
        className={cn(
          'flex-1 px-4 py-3',
          column.sortable && 'cursor-pointer select-none hover:bg-muted/30',
          column.className,
          index === 0 && 'pl-6'
        )}
        style={{
          minWidth: column.width ? `${column.width}px` : '150px',
          maxWidth: column.width ? `${column.width}px` : 'none',
        }}
        onClick={() => column.sortable && onSort(column.accessorKey)}
        role="columnheader"
        aria-sort={
          column.sortable && sortConfig.key === column.accessorKey
            ? sortConfig.direction === 'asc'
              ? 'ascending'
              : 'descending'
            : column.sortable
              ? 'none'
              : undefined
        }
      >
        <div className="flex items-center gap-2">
          {column.header}
          {column.sortable && (
            <div
              className={cn(
                'transition-all duration-200',
                sortConfig.key === column.accessorKey ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {getSortIcon(column.accessorKey)}
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

const VirtualizedDataTableComponent = ({
  data = [],
  columns = [],
  title,
  description,
  headerExtra,
  searchable = true,
  filterable = true,
  exportable = true,
  pagination = true,
  pageSize = 50, // Larger default for virtualization
  className,
  onRowClick,
  defaultSort = null,
  loading = false,
  virtualizeThreshold = 100, // Only virtualize for large datasets
  itemHeight = 60, // Height per row in pixels
  maxHeight = 600, // Max height of virtual list
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(defaultSort || { key: null, direction: 'asc' });
  const [filters] = useState({});

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = Array.isArray(data) ? data : [];

    // Apply search
    if (searchQuery) {
      const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
      };

      filtered = filtered.filter(row =>
        columns.some(column => {
          const value = getNestedValue(row, column.accessorKey);
          return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(row => row[key] === value);
      }
    });

    return filtered;
  }, [data, searchQuery, filters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
      };

      let aValue = getNestedValue(a, sortConfig.key);
      let bValue = getNestedValue(b, sortConfig.key);

      aValue = aValue ?? '';
      bValue = bValue ?? '';

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aStr > bStr) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data (for regular tables or virtualized with pagination)
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const shouldVirtualize = sortedData.length >= virtualizeThreshold;
  const displayData = shouldVirtualize && !pagination ? sortedData : paginatedData;
  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = key => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = key => {
    if (sortConfig.key !== key) return <ArrowUpDown className="h-4 w-4" />;
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  const renderCell = (row, column) => {
    if (column.type === 'actions') {
      return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label={`Actions for ${row.name || 'item'}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {column.actions?.map(action => (
              <React.Fragment key={action.label}>
                <DropdownMenuItem
                  onClick={() => action.onClick(row)}
                  className={action.destructive ? 'text-destructive' : ''}
                >
                  {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                  {action.label}
                </DropdownMenuItem>
                {action.separator && <DropdownMenuSeparator />}
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    const value = row[column.accessorKey];

    if (column.cell) {
      return column.cell({ row, value });
    }

    switch (column.type) {
      case 'badge':
        return <Badge variant={column.badgeVariant?.(value) || 'default'}>{value}</Badge>;
      case 'switch':
        return (
          <Switch
            checked={value}
            onCheckedChange={checked => column.onToggle?.(row, checked)}
            aria-label={`Toggle ${column.header.toLowerCase()} for ${row.name || 'item'}`}
          />
        );
      default:
        return value;
    }
  };

  if (loading) {
    return (
      <Card gradient className={cn('w-full', className)}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-10 bg-muted/50 rounded animate-pulse"></div>
            <div className="h-96 bg-muted/30 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card gradient className={cn('w-full', className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        {headerExtra}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gradient-subtle/30 rounded-lg border border-border/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 w-full sm:w-auto">
            {searchable && (
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 bg-background/50 border-border/50 focus:border-primary/50"
                />
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {filterable && (
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              )}

              {/* Performance indicator */}
              {shouldVirtualize && !pagination && (
                <Badge variant="secondary" className="text-xs">
                  Virtual ({sortedData.length} items)
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {exportable && (
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="rounded-lg border bg-gradient-card overflow-hidden shadow-medium">
          {/* Header */}
          <VirtualTableHeader
            columns={columns}
            sortConfig={sortConfig}
            onSort={handleSort}
            getSortIcon={getSortIcon}
          />

          {/* Table Body */}
          {displayData.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-muted-foreground font-medium">
                {searchQuery ? 'No results found' : 'No data available'}
              </div>
            </div>
          ) : shouldVirtualize && !pagination ? (
            // Virtual scrolling for large datasets
            <List
              height={Math.min(maxHeight, displayData.length * itemHeight)}
              itemCount={displayData.length}
              itemSize={itemHeight}
              itemData={{
                row: displayData,
                columns,
                onRowClick,
                renderCell,
              }}
              className="virtual-table-body"
            >
              {VirtualTableRow}
            </List>
          ) : (
            // Regular rendering for smaller datasets
            <div className="divide-y divide-border/50">
              {displayData.map((row, index) => (
                <div
                  key={row.id || index}
                  className="flex items-center hover:bg-muted/30 transition-colors duration-200 cursor-pointer"
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column, colIndex) => (
                    <div
                      key={column.accessorKey}
                      className={cn(
                        'flex-1 px-4 py-3 text-sm',
                        column.className,
                        colIndex === 0 && 'pl-6'
                      )}
                      style={{
                        minWidth: column.width ? `${column.width}px` : '150px',
                        maxWidth: column.width ? `${column.width}px` : 'none',
                      }}
                    >
                      {renderCell(row, column)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-subtle/20 rounded-lg border border-border/30">
            <div className="text-sm text-muted-foreground font-medium">
              Showing{' '}
              <span className="text-foreground font-semibold">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="text-foreground font-semibold">
                {Math.min(currentPage * pageSize, sortedData.length)}
              </span>{' '}
              of <span className="text-foreground font-semibold">{sortedData.length}</span> results
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-1 mx-2">
                {(() => {
                  const maxVisible = 5;
                  const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
                  const adjustedStartPage = Math.max(1, endPage - maxVisible + 1);

                  return Array.from({ length: endPage - adjustedStartPage + 1 }, (_, i) => {
                    const page = adjustedStartPage + i;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  });
                })()}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Custom comparison function for React.memo
const areVirtualizedDataTablePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.columns === nextProps.columns &&
    prevProps.loading === nextProps.loading &&
    prevProps.title === nextProps.title &&
    prevProps.virtualizeThreshold === nextProps.virtualizeThreshold
  );
};

const VirtualizedDataTable = React.memo(
  VirtualizedDataTableComponent,
  areVirtualizedDataTablePropsEqual
);

export { VirtualizedDataTable };
