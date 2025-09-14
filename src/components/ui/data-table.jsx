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

// eslint-disable-next-line import/order
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

const DataTableComponent = ({
  data = [],
  columns = [],
  title,
  description,
  headerExtra,
  searchable = true,
  filterable = true,
  exportable = true,
  pagination = true,
  pageSize = 10,
  className,
  onRowClick,
  defaultSort = null,
  loading = false,
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
      // Handle nested property access (e.g., 'defaultRole.name')
      const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
      };

      let aValue = getNestedValue(a, sortConfig.key);
      let bValue = getNestedValue(b, sortConfig.key);

      // Handle null/undefined values - treat them as empty strings for sorting
      aValue = aValue ?? '';
      bValue = bValue ?? '';

      // Convert to strings for consistent comparison
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

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

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
    // Handle actions type first since it doesn't need a value
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
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            sideOffset={4}
            alignOffset={-4}
            collisionPadding={8}
            avoidCollisions={true}
            sticky="partial"
            role="menu"
          >
            {column.actions?.map(action => (
              <React.Fragment key={action.label}>
                <DropdownMenuItem
                  onClick={() => action.onClick(row)}
                  className={action.destructive ? 'text-destructive' : ''}
                  role="menuitem"
                >
                  {action.icon && <action.icon className="mr-2 h-4 w-4" aria-hidden="true" />}
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

    // Default cell rendering based on type
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
        <CardContent className="p-6 space-y-4">
          {headerExtra}
          <div className="space-y-4">
            {/* Loading controls skeleton */}
            <div className="flex items-center justify-between gap-4 p-4 bg-gradient-subtle/30 rounded-lg border border-border/50 animate-fade-in">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-9 w-64 bg-muted/50 rounded-md loading-shimmer animate-pulse"></div>
                <div
                  className="h-9 w-20 bg-muted/50 rounded-md loading-shimmer animate-pulse"
                  style={{ animationDelay: '0.1s' }}
                ></div>
              </div>
              <div
                className="h-9 w-20 bg-muted/50 rounded-md loading-shimmer animate-pulse"
                style={{ animationDelay: '0.2s' }}
              ></div>
            </div>

            {/* Loading table skeleton */}
            <div
              className="rounded-lg border bg-gradient-card overflow-hidden shadow-medium animate-fade-in"
              style={{ animationDelay: '0.1s' }}
            >
              <div className="p-4 border-b border-border/50">
                <div className="flex gap-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={i}
                      className="h-4 bg-muted/50 rounded loading-shimmer animate-pulse flex-1"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex gap-4" style={{ animationDelay: `${i * 0.05}s` }}>
                    {Array.from({ length: 4 }, (_, j) => (
                      <div
                        key={j}
                        className="h-4 bg-muted/30 rounded loading-shimmer animate-pulse flex-1"
                        style={{ animationDelay: `${(i * 4 + j) * 0.02}s` }}
                      ></div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Loading pagination skeleton */}
            <div
              className="flex items-center justify-between p-4 bg-gradient-subtle/20 rounded-lg border border-border/30 animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="h-4 w-48 bg-muted/50 rounded loading-shimmer animate-pulse"></div>
              <div className="flex gap-2">
                {Array.from({ length: 7 }, (_, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 bg-muted/50 rounded loading-shimmer animate-pulse"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  ></div>
                ))}
              </div>
            </div>
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
        {/* Controls - Responsive Layout */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gradient-subtle/30 rounded-lg border border-border/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 w-full sm:w-auto">
            {searchable && (
              <div className="relative w-full sm:max-w-sm group">
                <label htmlFor="table-search" className="sr-only">
                  Search table data
                </label>
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200"
                  aria-hidden="true"
                />
                <Input
                  id="table-search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200 ease-smooth w-full"
                  aria-describedby="search-results-count"
                />
                {searchQuery && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-muted/50"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <span aria-hidden="true">×</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {filterable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 ease-smooth"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {Object.keys(filters).length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                      {Object.keys(filters).length}
                    </Badge>
                  )}
                </Button>
              )}

              {/* Results count indicator */}
              {searchQuery && (
                <div className="text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-md whitespace-nowrap">
                  {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {exportable && (
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 ease-smooth"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
          </div>
        </div>

        {/* Table - Responsive structure */}
        <div className="data-table-container rounded-lg border bg-gradient-card overflow-x-auto shadow-medium hover:shadow-large transition-shadow duration-300 ease-smooth relative">
          <Table className="w-full" role="table" aria-label={title || 'Data table'}>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                {columns.map(column => (
                  <TableHead
                    key={column.accessorKey}
                    className={cn(
                      column.sortable &&
                        'cursor-pointer select-none hover:bg-muted/30 transition-all duration-200 ease-smooth',
                      column.width && `w-${column.width}`,
                      column.className,
                      'font-semibold text-foreground/90'
                    )}
                    onClick={() => column.sortable && handleSort(column.accessorKey)}
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
                    tabIndex={column.sortable ? 0 : undefined}
                    onKeyDown={e => {
                      if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleSort(column.accessorKey);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 py-1">
                      {column.header}
                      {column.sortable && (
                        <div
                          className={cn(
                            'transition-all duration-200 ease-smooth',
                            sortConfig.key === column.accessorKey
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          )}
                          aria-hidden="true"
                        >
                          {getSortIcon(column.accessorKey)}
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                        <Search className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="text-muted-foreground font-medium">
                        {searchQuery ? 'No results found' : 'No data available'}
                      </div>
                      {searchQuery && (
                        <div className="text-sm text-muted-foreground/70">
                          Try adjusting your search terms
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                  <TableRow
                    key={row.id || index}
                    className="border-b"
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map(column => (
                      <TableCell
                        key={column.accessorKey}
                        className={cn(
                          'py-4 transition-colors duration-200 ease-smooth group-hover:text-foreground',
                          column.className
                        )}
                      >
                        {renderCell(row, column)}
                      </TableCell>
                    ))}
                    {/* Enhanced hover indicator - commented out for debugging
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-primary opacity-0 group-hover:opacity-100 transition-all duration-300 ease-smooth rounded-r scale-y-0 group-hover:scale-y-100" />
                      
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
                      </div>
                      */}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination - Responsive */}
        {pagination && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-subtle/20 rounded-lg border border-border/30">
            <div className="text-sm text-muted-foreground font-medium text-center sm:text-left">
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
              {/* First/Previous buttons - always show on mobile */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 ease-smooth disabled:opacity-50"
                aria-label="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 ease-smooth disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page numbers - responsive visibility */}
              <div className="flex items-center gap-1 mx-2">
                {(() => {
                  // Show fewer pages on mobile - use a responsive approach
                  const maxVisible = 5; // Default to desktop view
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
                        className={cn(
                          'w-8 h-8 p-0 transition-colors duration-200 ease-smooth',
                          currentPage === page
                            ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                            : 'hover:bg-muted/50 hover:border-primary/30'
                        )}
                        aria-label={`Page ${page}`}
                      >
                        {page}
                      </Button>
                    );
                  });
                })()}
              </div>

              {/* Next/Last buttons - always show on mobile */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 ease-smooth disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 ease-smooth disabled:opacity-50"
                aria-label="Last page"
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
// Re-render only when data, columns, or loading state changes
const areDataTablePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.columns === nextProps.columns &&
    prevProps.loading === nextProps.loading &&
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description
  );
};

const DataTable = React.memo(DataTableComponent, areDataTablePropsEqual);

export { DataTable };
