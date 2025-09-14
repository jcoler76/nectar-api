/* eslint-disable testing-library/no-unnecessary-act, jest/no-conditional-expect, jest/valid-title */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import SalesforceActionPanel from './SalesforceActionPanel';

global.fetch = jest.fn();

const mockNode = {
  id: 'test-node',
  data: {
    connection: {
      instanceUrl: 'https://test.my.salesforce.com',
      accessToken: 'test-token',
      apiVersion: 'v58.0',
    },
    operation: 'create',
    object: 'Lead',
    dataMapping: {
      fields: {
        'input.name': 'Name',
        'input.email': 'Email',
      },
    },
  },
};

const mockOnNodeDataChange = jest.fn();

describe('SalesforceActionPanel Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  test('renders core elements and accepts input', async () => {
    render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    // Check that the main title is present
    expect(screen.getByText('Salesforce Record Action')).toBeInTheDocument();

    // Check that connection fields are present and have expected values
    const instanceUrlField = screen.getByDisplayValue('https://test.my.salesforce.com');
    expect(instanceUrlField).toBeInTheDocument();

    const accessTokenField = screen.getByDisplayValue('test-token');
    expect(accessTokenField).toBeInTheDocument();

    const apiVersionField = screen.getByDisplayValue('v58.0');
    expect(apiVersionField).toBeInTheDocument();

    // Test that fields can be updated
    await act(async () => {
      fireEvent.change(instanceUrlField, { target: { value: 'https://new.salesforce.com' } });
    });

    expect(mockOnNodeDataChange).toHaveBeenCalled();
    const lastCall = mockOnNodeDataChange.mock.calls[mockOnNodeDataChange.mock.calls.length - 1][0];
    expect(lastCall.connection.instanceUrl).toBe('https://new.salesforce.com');
  });

  test('handles operation dropdown interaction', async () => {
    render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    // Find the operation select by finding the select with value 'create' (default)
    const operationSelect = screen.getByDisplayValue('create');
    expect(operationSelect).toBeInTheDocument();

    // Test changing the operation
    await act(async () => {
      fireEvent.change(operationSelect, { target: { value: 'update' } });
    });

    expect(mockOnNodeDataChange).toHaveBeenCalled();
    const lastCall = mockOnNodeDataChange.mock.calls[mockOnNodeDataChange.mock.calls.length - 1][0];
    expect(lastCall.operation).toBe('update');
  });

  test('handles field mapping operations', async () => {
    render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    // Check existing field mappings are displayed
    expect(screen.getByText(/input.name.*Name/)).toBeInTheDocument();
    expect(screen.getByText(/input.email.*Email/)).toBeInTheDocument();

    // Test removing a field mapping
    const removeButton = screen.getByText(/input.name.*Name.*remove/);
    await act(async () => {
      fireEvent.click(removeButton);
    });

    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test('test connection functionality', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { id: 'test-id' } }),
    });

    render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    const testButton = screen.getByText('Test Action');
    expect(testButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(testButton);
    });

    // Verify the API call was made
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/workflows/test-salesforce-action',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    // Check that success message appears
    await waitFor(() => {
      expect(screen.getByText('Connection OK')).toBeInTheDocument();
    });
  });

  test('displays conditional fields based on operation', async () => {
    const updateNode = {
      ...mockNode,
      data: { ...mockNode.data, operation: 'update' },
    };

    render(<SalesforceActionPanel node={updateNode} onNodeDataChange={mockOnNodeDataChange} />);

    // For update operation, record ID field should be present
    expect(screen.getByLabelText('Record ID')).toBeInTheDocument();
  });

  test('handles error states in test connection', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: 'Invalid credentials' }),
    });

    render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    const testButton = screen.getByText('Test Action');

    await act(async () => {
      fireEvent.click(testButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  test('initializes with defaults for empty node data', () => {
    const emptyNode = { id: 'empty-node', data: {} };

    render(<SalesforceActionPanel node={emptyNode} onNodeDataChange={mockOnNodeDataChange} />);

    // Should have been called with default values
    expect(mockOnNodeDataChange).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({
          accessToken: '',
          instanceUrl: '',
          apiVersion: 'v58.0',
        }),
        operation: 'create',
        object: 'Lead',
      })
    );
  });
});
