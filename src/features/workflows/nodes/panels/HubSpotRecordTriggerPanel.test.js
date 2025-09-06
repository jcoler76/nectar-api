import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import HubSpotRecordTriggerPanel from './HubSpotRecordTriggerPanel.jsx';

// Mock fetch
global.fetch = jest.fn();

const mockNode = {
  id: 'hs-trigger',
  data: {
    connection: {
      baseUrl: 'https://api.hubapi.com',
      accessToken: 'test-token',
      apiVersion: 'v3',
    },
    eventType: 'new',
    object: 'contact',
    pollingInterval: 300000,
    propertiesToMonitor: [],
    filters: '',
  },
};

const mockOnNodeDataChange = jest.fn();

describe('HubSpotRecordTriggerPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  test('renders and shows connection fields', () => {
    render(<HubSpotRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
    expect(screen.getByText('HubSpot Record Trigger')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://api.hubapi.com')).toBeInTheDocument();
  });

  test('adds monitored property', () => {
    window.prompt = jest.fn().mockReturnValueOnce('email');
    const updatedNode = {
      ...mockNode,
      data: { ...mockNode.data, eventType: 'updated' },
    };
    render(
      <HubSpotRecordTriggerPanel node={updatedNode} onNodeDataChange={mockOnNodeDataChange} />
    );
    fireEvent.click(screen.getByText('Add Property to Monitor'));
    expect(window.prompt).toHaveBeenCalledTimes(1);
    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test('calls test endpoint', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, sample: { id: '1' } }),
    });
    render(<HubSpotRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
    fireEvent.click(screen.getByText('Test Trigger'));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/workflows/test-hubspot-record-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      });
    });
  });
});
