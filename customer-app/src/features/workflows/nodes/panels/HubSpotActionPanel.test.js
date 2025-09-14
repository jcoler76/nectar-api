import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import HubSpotActionPanel from './HubSpotActionPanel.jsx';

// Mock fetch
global.fetch = jest.fn();

const mockNode = {
  id: 'hs-action',
  data: {
    connection: {
      baseUrl: 'https://api.hubapi.com',
      accessToken: 'test-token',
      apiVersion: 'v3',
    },
    object: 'contact',
    operation: 'create',
    dataMapping: { properties: {} },
  },
};

const mockOnNodeDataChange = jest.fn();

describe('HubSpotActionPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  test('renders and shows connection fields', () => {
    render(<HubSpotActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
    expect(screen.getByText('HubSpot Action')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://api.hubapi.com')).toBeInTheDocument();
  });

  test('adds property mapping', () => {
    window.prompt = jest.fn().mockReturnValueOnce('contact.email').mockReturnValueOnce('email');
    render(<HubSpotActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
    fireEvent.click(screen.getByText('Add Mapping'));
    expect(window.prompt).toHaveBeenCalledTimes(2);
    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test('calls test endpoint', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, result: { status: 'success', data: { id: '1' } } }),
    });
    render(<HubSpotActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
    fireEvent.click(screen.getByText('Test Action'));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/workflows/test-hubspot-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      });
    });
  });

  test('shows Update Deal Stage fields when selected', () => {
    const node = { ...mockNode, data: { ...mockNode.data, operation: 'updateDealStage' } };
    render(<HubSpotActionPanel node={node} onNodeDataChange={mockOnNodeDataChange} />);
    expect(screen.getByLabelText('Deal Stage ID')).toBeInTheDocument();
  });

  test('shows Enroll Contact in Workflow fields when selected', () => {
    const node = { ...mockNode, data: { ...mockNode.data, operation: 'enrollInWorkflow' } };
    render(<HubSpotActionPanel node={node} onNodeDataChange={mockOnNodeDataChange} />);
    expect(screen.getByLabelText('Workflow ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Contact Email')).toBeInTheDocument();
  });

  test('applies Contact template to mapping', () => {
    const node = {
      ...mockNode,
      data: {
        ...mockNode.data,
        object: 'contact',
        operation: 'create',
        _templateSelection: 'contact',
      },
    };
    render(<HubSpotActionPanel node={node} onNodeDataChange={mockOnNodeDataChange} />);
    fireEvent.click(screen.getByText('Property Mapping'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Template' }));
    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test('applies Deal template to mapping', () => {
    const node = {
      ...mockNode,
      data: { ...mockNode.data, object: 'deal', operation: 'create', _templateSelection: 'deal' },
    };
    render(<HubSpotActionPanel node={node} onNodeDataChange={mockOnNodeDataChange} />);
    fireEvent.click(screen.getByText('Property Mapping'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Template' }));
    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });
});
