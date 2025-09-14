import PropTypes from 'prop-types';

import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';

const CustomPagination = ({
  page,
  totalPages,
  totalRecords,
  recordsPerPage,
  loading,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-subtle/20 rounded-lg border border-border/30 mt-4">
      <div className="text-sm text-muted-foreground font-medium text-center sm:text-left">
        Page <span className="text-foreground font-semibold">{page}</span> of{' '}
        <span className="text-foreground font-semibold">{totalPages}</span> (
        {totalRecords.toLocaleString()} total records)
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={page === 1 || loading}
          className="hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 ease-smooth disabled:opacity-50"
          aria-label="First page"
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || loading}
          className="hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 ease-smooth disabled:opacity-50"
          aria-label="Previous page"
        >
          Previous
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-2">
          {(() => {
            const maxVisible = 5;
            const startPage = Math.max(1, page - Math.floor(maxVisible / 2));
            const endPage = Math.min(totalPages, startPage + maxVisible - 1);
            const adjustedStartPage = Math.max(1, endPage - maxVisible + 1);

            return Array.from({ length: endPage - adjustedStartPage + 1 }, (_, i) => {
              const pageNum = adjustedStartPage + i;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  disabled={loading}
                  className={cn(
                    'w-8 h-8 p-0 transition-colors duration-200 ease-smooth',
                    page === pageNum
                      ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                      : 'hover:bg-muted/50 hover:border-primary/30'
                  )}
                  aria-label={`Page ${pageNum}`}
                >
                  {pageNum}
                </Button>
              );
            });
          })()}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || loading}
          className="hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 ease-smooth disabled:opacity-50"
          aria-label="Next page"
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages || loading}
          className="hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 ease-smooth disabled:opacity-50"
          aria-label="Last page"
        >
          Last
        </Button>
      </div>
    </div>
  );
};

CustomPagination.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  totalRecords: PropTypes.number.isRequired,
  recordsPerPage: PropTypes.number.isRequired,
  loading: PropTypes.bool,
  onPageChange: PropTypes.func.isRequired,
};

export default CustomPagination;
