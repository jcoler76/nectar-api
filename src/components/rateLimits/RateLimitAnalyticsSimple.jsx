import React from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const RateLimitAnalyticsSimple = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Rate Limit Analytics</CardTitle>
          <CardDescription>Simple test component to verify navigation works</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            This is a simplified rate limit analytics page. If you can see this, the navigation is
            working.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RateLimitAnalyticsSimple;
