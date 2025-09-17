import { BarChart3, Brain, DollarSign, TrendingUp } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

import BusinessImpactDashboard from './BusinessImpactDashboard';
import NaturalLanguageQuery from './NaturalLanguageQuery';
import WorkflowPerformanceDashboard from './WorkflowPerformanceDashboard';

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const analyticsFeatures = [
    {
      icon: <Brain className="h-8 w-8 text-blue-500" />,
      title: 'AI-Powered Queries',
      description: 'Ask questions about your data in natural language and get instant insights.',
      benefit: 'Reduce time-to-insight by 80%',
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-green-500" />,
      title: 'Workflow Analytics',
      description:
        'Monitor performance, identify bottlenecks, and optimize your automation workflows.',
      benefit: 'Improve workflow efficiency by 40%',
    },
    {
      icon: <DollarSign className="h-8 w-8 text-purple-500" />,
      title: 'Business Impact',
      description: 'Measure ROI, cost savings, and business value of your automation investments.',
      benefit: 'Justify automation spend with clear ROI',
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-orange-500" />,
      title: 'Real-time Dashboards',
      description:
        'Monitor key metrics, track trends, and stay informed with live data visualization.',
      benefit: 'Make data-driven decisions faster',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Business Intelligence & Analytics</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Unlock the power of your data with AI-driven insights, real-time monitoring, and
          comprehensive business impact analysis.
        </p>
      </div>

      {/* Analytics Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
        {analyticsFeatures.map((feature, index) => (
          <Card key={index} className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-center mb-4">{feature.icon}</div>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-3">{feature.description}</p>
              <div className="bg-blue-50 p-2 rounded text-xs font-medium text-blue-700">
                {feature.benefit}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analytics Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="query">AI Query</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Analytics Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Quick Start Guide</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium">Try Natural Language Queries</h4>
                        <p className="text-sm text-muted-foreground">
                          Ask questions like "Show me API usage trends" or "How many active users?"
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium">Monitor Workflow Performance</h4>
                        <p className="text-sm text-muted-foreground">
                          Track execution times, success rates, and optimization opportunities
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium">Measure Business Impact</h4>
                        <p className="text-sm text-muted-foreground">
                          Calculate ROI, time savings, and cost reduction from automation
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Key Benefits</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900">Instant Insights</h4>
                      <p className="text-sm text-blue-700">
                        Get answers to complex data questions in seconds, not hours
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900">Performance Optimization</h4>
                      <p className="text-sm text-green-700">
                        Identify bottlenecks and optimize workflows for better efficiency
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900">ROI Visibility</h4>
                      <p className="text-sm text-purple-700">
                        Demonstrate clear business value and justify automation investments
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-4 justify-center">
                <Button onClick={() => setActiveTab('query')} className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Try AI Queries
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('business')}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  View Business Impact
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="query">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6" />
                Natural Language Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NaturalLanguageQuery />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          <WorkflowPerformanceDashboard showSummary={true} />
        </TabsContent>

        <TabsContent value="business">
          <BusinessImpactDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
