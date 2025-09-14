import { AlertCircle, Download, RefreshCw, RotateCcw, Search } from 'lucide-react';
import PropTypes from 'prop-types';

import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

const ReportFiltersCard = ({
  title = 'Report Filters',
  icon: Icon,
  error,
  loading,
  hasData,
  onSearch,
  onReset,
  onExport,
  searchLabel = 'Search',
  resetLabel = 'Reset',
  exportLabel = 'Export',
  children,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Messages */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="flex items-center gap-2 p-4">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive font-medium">{error}</span>
            </CardContent>
          </Card>
        )}

        {/* Filter Controls */}
        {children}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="ocean"
            onClick={onSearch}
            disabled={loading}
            className="min-w-[100px] bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500"
          >
            {loading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {searchLabel}
          </Button>

          <Button variant="outline" onClick={onReset} disabled={loading}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {resetLabel}
          </Button>

          {hasData && onExport && (
            <Button variant="outline" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              {exportLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

ReportFiltersCard.propTypes = {
  title: PropTypes.string,
  icon: PropTypes.elementType,
  error: PropTypes.string,
  loading: PropTypes.bool,
  hasData: PropTypes.bool,
  onSearch: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onExport: PropTypes.func,
  searchLabel: PropTypes.string,
  resetLabel: PropTypes.string,
  exportLabel: PropTypes.string,
  children: PropTypes.node,
};

export default ReportFiltersCard;
