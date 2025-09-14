import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

import { cn } from '../../lib/utils';

import { Button } from './button';
import { Card, CardContent } from './card';
import { Input } from './input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

// Memoized table row component to prevent unnecessary re-renders
const TableRowMemo = memo(({ row, columns, onRowClick }) => (
  <TableRow
    className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
    onClick={() => onRowClick?.(row)}
  >
    {columns.map(column => (
      <TableCell key={column.accessorKey} className="py-3">
        {column.cell
          ? column.cell({ row, value: row[column.accessorKey] })
          : row[column.accessorKey]}
      </TableCell>
    ))}
  </TableRow>
));

TableRowMemo.displayName = 'TableRowMemo';

// Lightweight data table optimized for performance
const LazyDataTable = memo(
  ({
    data = [],
    columns = [],
    searchable = true,
    pageSize = 10,
    className,
    onRowClick,
    loading = false,
  }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Optimized filtering with early return
    const filteredData = useMemo(() => {
      const safeData = Array.isArray(data) ? data : [];
      if (!searchQuery) return safeData;

      const query = searchQuery.toLowerCase();
      return safeData.filter(row =>
        columns.some(column => {
          const value = row[column.accessorKey];
          return value?.toString().toLowerCase().includes(query);
        })
      );
    }, [data, searchQuery, columns]);

    // Optimized sorting
    const sortedData = useMemo(() => {
      if (!sortConfig.key) return filteredData;

      return [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === bValue) return 0;

        const result = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'asc' ? result : -result;
      });
    }, [filteredData, sortConfig]);

    // Simple pagination
    const paginatedData = useMemo(() => {
      const startIndex = (currentPage - 1) * pageSize;
      return sortedData.slice(startIndex, startIndex + pageSize);
    }, [sortedData, currentPage, pageSize]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    const handleSort = useCallback(key => {
      setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
      }));
    }, []);

    const getSortIcon = useCallback(
      key => {
        if (sortConfig.key !== key) return <ArrowUpDown className="h-4 w-4" />;
        return sortConfig.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        );
      },
      [sortConfig]
    );

    if (loading) {
      return (
        <Card className={cn('w-full', className)}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-10 bg-muted/50 rounded animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="space-y-4">
          {/* Simple search */}
          {searchable && (
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              {searchQuery && (
                <div className="text-sm text-muted-foreground">
                  {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* Lightweight table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map(column => (
                    <TableHead
                      key={column.accessorKey}
                      className={cn(
                        column.sortable && 'cursor-pointer select-none hover:bg-muted/30',
                        'font-semibold'
                      )}
                      onClick={() => column.sortable && handleSort(column.accessorKey)}
                    >
                      <div className="flex items-center gap-2">
                        {column.header}
                        {column.sortable && getSortIcon(column.accessorKey)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchQuery ? 'No results found' : 'No data available'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, index) => (
                    <TableRowMemo
                      key={row.id || row._id || index}
                      row={row}
                      columns={columns}
                      onRowClick={onRowClick}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Simple pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
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
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

LazyDataTable.displayName = 'LazyDataTable';

export { LazyDataTable };
