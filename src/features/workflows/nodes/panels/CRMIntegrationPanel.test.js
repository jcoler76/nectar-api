import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import CRMIntegrationPanel from './CRMIntegrationPanel';

// Mock fetch
global.fetch = jest.fn();

const mockNode = {
  id: 'test-node',
  data: {
    crmType: 'custom',
    connection: {
      baseURL: 'https://api.test.com',
      timeout: 30000,
    },
    operation: 'create',
    dataMapping: {
      fields: {},
      crmDefaults: {},
      includeMetadata: true,
    },
    batchSettings: {
      enabled: false,
      batchSize: 20,
    },
    errorHandling: {
      retryOnError: true,
      retryCount: 3,
    },
  },
};

const mockOnNodeDataChange = jest.fn();

describe('CRMIntegrationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  test('renders without crashing', () => {
    render(<CRMIntegrationPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
    expect(screen.getByText('CRM Integration Configuration')).toBeInTheDocument();
  });

  test('displays CRM connection section', () => {
    render(<CRMIntegrationPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
    expect(screen.getByText('CRM Connection')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://api.test.com')).toBeInTheDocument();
  });

  test.skip('handles CRM type change', () => {
    render(<CRMIntegrationPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    const crmSelect = screen.getByDisplayValue('Custom HTTP API');
    fireEvent.mouseDown(crmSelect);

    const salesforceOption = screen.getByText('Salesforce');
    fireEvent.click(salesforceOption);

    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test.skip('shows operation selection', () => {
    render(<CRMIntegrationPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
    expect(screen.getByDisplayValue('Create New Records')).toBeInTheDocument();
  });

  test('allows adding field mappings', () => {
    window.prompt = jest
      .fn()
      .mockReturnValueOnce('company_name')
      .mockReturnValueOnce('Name')
      .mockReturnValueOnce(''); // No transformation

    render(<CRMIntegrationPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    const addButton = screen.getByText('Add Field Mapping');
    fireEvent.click(addButton);

    expect(window.prompt).toHaveBeenCalledTimes(3);
    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test('enables batch processing', () => {
    render(<CRMIntegrationPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    const batchSwitch = screen.getByLabelText(/Enable Batch Processing/i);
    fireEvent.click(batchSwitch);

    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test('handles test connection', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { processed: 1, results: [{ id: 'test-record' }] },
      }),
    });

    render(<CRMIntegrationPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    const testButton = screen.getByText('Test CRM Integration');
    fireEvent.click(testButton);

    expect(screen.getByText('Testing Integration...')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/workflows/test-crm-integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crmType: 'custom',
          connection: mockNode.data.connection,
          operation: 'create',
          testData: {
            name: 'Test Contact',
            email: 'test@example.com',
            company: 'Test Company',
          },
        }),
      });
    });
  });

  test('configures error handling settings', () => {
    render(<CRMIntegrationPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    const retryCountInput = screen.getByDisplayValue('3');
    fireEvent.change(retryCountInput, { target: { value: '5' } });

    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test('shows custom headers for custom CRM type', () => {
    render(<CRMIntegrationPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
    expect(screen.getByText('Custom Headers (0)')).toBeInTheDocument();
  });

  test('validates timeout input', () => {
    render(<CRMIntegrationPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

    const timeoutInput = screen.getByDisplayValue('30000');
    fireEvent.change(timeoutInput, { target: { value: '60000' } });

    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });
});
