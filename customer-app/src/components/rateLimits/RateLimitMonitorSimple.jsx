import React from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const RateLimitMonitorSimple = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Rate Limit Monitor</CardTitle>
          <CardDescription>Simple test component to verify navigation works</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            This is a simplified rate limit monitor page. If you can see this, the navigation is
            working.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RateLimitMonitorSimple;
