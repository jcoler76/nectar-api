import { Activity, CheckCircle, Clock, XCircle } from 'lucide-react';
import PropTypes from 'prop-types';

import { Card, CardContent } from '../../ui/card';

const formatDuration = duration => {
  if (duration < 1000) return `${Math.round(duration)}ms`;
  return `${(duration / 1000).toFixed(2)}s`;
};

const ActivityStatisticsCards = ({ statistics }) => {
  if (!statistics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold">
                {statistics.summary.totalRequests.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">
                {statistics.summary.totalRequests > 0
                  ? (
                      (statistics.summary.successfulRequests / statistics.summary.totalRequests) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
              <p className="text-2xl font-bold">
                {formatDuration(statistics.summary.averageResponseTime || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Failed Requests</p>
              <p className="text-2xl font-bold">
                {statistics.summary.failedRequests.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

ActivityStatisticsCards.propTypes = {
  statistics: PropTypes.shape({
    summary: PropTypes.shape({
      totalRequests: PropTypes.number,
      successfulRequests: PropTypes.number,
      failedRequests: PropTypes.number,
      averageResponseTime: PropTypes.number,
    }),
  }),
};

export default ActivityStatisticsCards;
