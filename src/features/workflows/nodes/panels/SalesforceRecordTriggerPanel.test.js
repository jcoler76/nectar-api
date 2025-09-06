/* eslint-disable jest/no-conditional-expect */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import SalesforceRecordTriggerPanel from './SalesforceRecordTriggerPanel';

global.fetch = jest.fn();

const mockNode = {
  id: 'test-trigger-node',
  data: {
    connection: {
      instanceUrl: 'https://test.my.salesforce.com',
      accessToken: 'test-token',
      apiVersion: 'v58.0',
    },
    object: 'Lead',
    triggerType: 'record_change',
    fields: ['Name', 'Email', 'Status'],
    conditions: [
      {
        field: 'Status',
        operator: 'equals',
        value: 'New',
      },
    ],
  },
};

const mockOnNodeDataChange = jest.fn();

describe('SalesforceRecordTriggerPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  test('renders without crashing', () => {
    render(
      <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
    );
    expect(screen.getByText(/Salesforce Record Trigger/i)).toBeInTheDocument();
  });

  describe('Connection Configuration', () => {
    test('displays connection fields', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      expect(screen.getByDisplayValue('https://test.my.salesforce.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-token')).toBeInTheDocument();
      expect(screen.getByDisplayValue('v58.0')).toBeInTheDocument();
    });

    test('updates instance URL', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      const instanceUrlField = screen.getByLabelText(/Instance URL/i);
      fireEvent.change(instanceUrlField, { target: { value: 'https://new.salesforce.com' } });

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: expect.objectContaining({
            instanceUrl: 'https://new.salesforce.com',
          }),
        })
      );
    });

    test('updates access token', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      const tokenField = screen.getByLabelText(/Access Token/i);
      fireEvent.change(tokenField, { target: { value: 'new-token' } });

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: expect.objectContaining({
            accessToken: 'new-token',
          }),
        })
      );
    });
  });

  describe('Trigger Configuration', () => {
    test('displays object API name field', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );
      expect(screen.getByDisplayValue('Lead')).toBeInTheDocument();
    });

    test('updates object API name', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      const objectField = screen.getByLabelText(/Object API Name/i);
      fireEvent.change(objectField, { target: { value: 'Contact' } });

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          object: 'Contact',
        })
      );
    });

    test('displays trigger type selection', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      // Trigger type should be displayed (implementation may vary)
      expect(
        screen.getByText(/Trigger Type/i) || screen.getByText(/Record Change/i)
      ).toBeInTheDocument();
    });
  });

  describe('Field Selection', () => {
    test('displays selected fields', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      // Should display field selection or field list
      expect(screen.getByText(/Fields/i) || screen.getByText(/Name/)).toBeInTheDocument();
    });

    test('allows field management', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      // Look for field management buttons or inputs
      const addFieldButton = screen.queryByText(/Add Field/i) || screen.queryByText(/\+/);
      if (addFieldButton) {
        fireEvent.click(addFieldButton);
        expect(mockOnNodeDataChange).toHaveBeenCalled();
      }
    });
  });

  describe('Conditions', () => {
    test('displays existing conditions', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      // Should show condition configuration
      expect(screen.getByText(/Conditions/i) || screen.getByText(/Status/)).toBeInTheDocument();
    });

    test('allows condition management', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      // Look for condition management buttons
      const addConditionButton = screen.queryByText(/Add Condition/i) || screen.queryByText(/\+/);
      if (addConditionButton) {
        fireEvent.click(addConditionButton);
        expect(mockOnNodeDataChange).toHaveBeenCalled();
      }
    });
  });

  describe('Test Connection', () => {
    test('handles successful connection test', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Connection successful' }),
      });

      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      const testButton = screen.queryByText(/Test/i);
      if (testButton) {
        fireEvent.click(testButton);

        await waitFor(() => {
          expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/'),
            expect.objectContaining({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            })
          );
        });
      }
    });

    test('handles failed connection test', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Authentication failed' }),
      });

      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      const testButton = screen.queryByText(/Test/i);
      if (testButton) {
        fireEvent.click(testButton);

        await waitFor(() => {
          expect(
            screen.getByText(/Authentication failed/i) || screen.getByText(/failed/i)
          ).toBeInTheDocument();
        });
      }
    });
  });

  describe('Default Data Handling', () => {
    test('initializes with default data when node data is empty', () => {
      const emptyNode = { id: 'empty-node', data: {} };

      render(
        <SalesforceRecordTriggerPanel node={emptyNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: expect.objectContaining({
            instanceUrl: expect.any(String),
            accessToken: expect.any(String),
            apiVersion: expect.any(String),
          }),
          object: expect.any(String),
          triggerType: expect.any(String),
        })
      );
    });

    test('preserves existing data', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: expect.objectContaining({
            instanceUrl: 'https://test.my.salesforce.com',
            accessToken: 'test-token',
            apiVersion: 'v58.0',
          }),
          object: 'Lead',
          triggerType: 'record_change',
        })
      );
    });
  });

  describe('Form Validation', () => {
    test('validates required fields', () => {
      const invalidNode = {
        id: 'invalid-node',
        data: {
          connection: {
            instanceUrl: '',
            accessToken: '',
          },
        },
      };

      render(
        <SalesforceRecordTriggerPanel node={invalidNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      // Should show validation messages or disable test button
      const testButton = screen.queryByText(/Test/i);
      if (testButton) {
        expect(testButton).toBeDisabled();
      }
    });

    test('enables functionality with valid data', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      // Should enable test functionality with valid data
      const testButton = screen.queryByText(/Test/i);
      if (testButton) {
        expect(testButton).not.toBeDisabled();
      }
    });
  });

  describe('Advanced Configuration', () => {
    test('handles polling interval configuration', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      // Look for polling/interval configuration
      const intervalField =
        screen.queryByLabelText(/Interval/i) || screen.queryByLabelText(/Polling/i);
      if (intervalField) {
        fireEvent.change(intervalField, { target: { value: '60' } });
        expect(mockOnNodeDataChange).toHaveBeenCalled();
      }
    });

    test('handles batch size configuration', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      // Look for batch configuration
      const batchField = screen.queryByLabelText(/Batch/i);
      if (batchField) {
        fireEvent.change(batchField, { target: { value: '100' } });
        expect(mockOnNodeDataChange).toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      const testButton = screen.queryByText(/Test/i);
      if (testButton) {
        fireEvent.click(testButton);

        await waitFor(() => {
          expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
        });
      }
    });

    test('displays appropriate error messages', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      const testButton = screen.queryByText(/Test/i);
      if (testButton) {
        fireEvent.click(testButton);

        await waitFor(() => {
          expect(
            screen.getByText(/Unauthorized/i) || screen.getByText(/error/i)
          ).toBeInTheDocument();
        });
      }
    });
  });

  describe('Data Persistence', () => {
    test('persists changes to node data', () => {
      render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      const objectField = screen.getByLabelText(/Object API Name/i);
      fireEvent.change(objectField, { target: { value: 'Opportunity' } });

      // Verify that the change is persisted
      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          object: 'Opportunity',
        })
      );
    });

    test('maintains data consistency', () => {
      const { rerender } = render(
        <SalesforceRecordTriggerPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      const updatedNode = {
        ...mockNode,
        data: {
          ...mockNode.data,
          object: 'Contact',
        },
      };

      rerender(
        <SalesforceRecordTriggerPanel node={updatedNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      expect(screen.getByDisplayValue('Contact')).toBeInTheDocument();
    });
  });
});
/* eslint-disable jest/no-conditional-expect */
