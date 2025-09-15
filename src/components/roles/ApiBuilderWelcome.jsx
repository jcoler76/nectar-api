import { ArrowRight, Sparkles } from 'lucide-react';
import React from 'react';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const ApiBuilderWelcome = ({ onNext }) => {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">Welcome to API Builder</CardTitle>
        <CardDescription className="text-lg">
          Generate production-ready REST APIs from your database in under 5 minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold text-green-800">✨ Zero-Code API Generation</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your database and instantly generate secure REST endpoints
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold text-blue-800">🔍 Auto-Discovery</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically discovers all tables, views, and their schemas
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold text-purple-800">🚀 Instant Testing</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Built-in API explorer for immediate testing and documentation
            </p>
          </div>
        </div>

        <div className="pt-4 text-center">
          <Button onClick={onNext} variant="ocean" size="lg" className="px-8">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiBuilderWelcome;
