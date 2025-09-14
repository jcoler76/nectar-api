import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import ZoomInfoIntentTriggerPanel from './ZoomInfoIntentTriggerPanel';

// Mock fetch
global.fetch = jest.fn();

const mockNode = {
  id: 'test-node',
  data: {
    credentials: {
      type: 'apikey',
      apiKey: '',
    },
    intentTopics: [],
    signalStrength: 'moderate',
    companyFilters: {},
    pollingInterval: 900000,
    advancedSettings: {
      batchSize: 50,
      includeContactData: true,
      minimumConfidenceScore: 0.7,
    },
  },
};

const mockOnNodeDataChange = jest.fn();

describe('ZoomInfoIntentTriggerPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  test('renders without crashing', () => {
    render(<ZoomInfoIntentTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
    expect(screen.getByText('ZoomInfo Intent Trigger Configuration')).toBeInTheDocument();
  });

  test('displays authentication section', () => {
    render(<ZoomInfoIntentTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.getByDisplayValue('apikey')).toBeInTheDocument();
  });

  test('allows adding intent topics', () => {
    // Mock prompt
    window.prompt = jest.fn().mockReturnValue('CRM Software');

    render(<ZoomInfoIntentTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    const addButton = screen.getByText('Add Intent Topic');
    fireEvent.click(addButton);

    expect(window.prompt).toHaveBeenCalledWith('Enter intent topic:');
    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test('handles test connection', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Test successful' }),
    });

    render(<ZoomInfoIntentTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    const testButton = screen.getByText('Test Connection');
    fireEvent.click(testButton);

    expect(screen.getByText('Testing Connection...')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/workflows/test-zoominfo-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockNode.data),
      });
    });
  });

  test('handles authentication type change', () => {
    render(<ZoomInfoIntentTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    const authSelect = screen.getByDisplayValue('apikey');
    fireEvent.change(authSelect, { target: { value: 'username_password' } });

    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test('validates required fields', () => {
    const emptyNode = { ...mockNode, data: {} };
    render(<ZoomInfoIntentTriggerPanel node={emptyNode} onNodeDataChange={mockOnNodeDataChange} />);

    // Component should still render with default data
    expect(screen.getByText('ZoomInfo Intent Trigger Configuration')).toBeInTheDocument();
  });
});
