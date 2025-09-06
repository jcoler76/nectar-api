import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    errorHandling: {
      retryOnError: true,
      retryCount: 3,
      retryDelay: 1000,
    },
  },
};

const mockOnNodeDataChange = jest.fn();

describe('SalesforceActionPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    window.prompt = jest.fn();
  });

  test('renders without crashing', () => {
    render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
    expect(screen.getByText('Salesforce Record Action')).toBeInTheDocument();
  });

  describe('Connection Configuration', () => {
    test('displays connection fields', () => {
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      expect(screen.getByDisplayValue('https://test.my.salesforce.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-token')).toBeInTheDocument();
      expect(screen.getByDisplayValue('v58.0')).toBeInTheDocument();
    });

    test('updates instance URL', () => {
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      const instanceUrlField = screen.getByLabelText('Instance URL');
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
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      const tokenField = screen.getByLabelText('Access Token');
      fireEvent.change(tokenField, { target: { value: 'new-token' } });

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: expect.objectContaining({
            accessToken: 'new-token',
          }),
        })
      );
    });

    test('updates API version', () => {
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      const versionField = screen.getByLabelText('API Version');
      fireEvent.change(versionField, { target: { value: 'v59.0' } });

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: expect.objectContaining({
            apiVersion: 'v59.0',
          }),
        })
      );
    });
  });

  describe('Operation Configuration', () => {
    test('displays operation dropdown with correct value', () => {
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
      // MUI Select doesn't use displayValue, check for the label text instead
      expect(screen.getByLabelText('Operation')).toBeInTheDocument();
      // The select should have the default 'create' value
      const operationSelect = screen.getByLabelText('Operation');
      expect(operationSelect).toHaveValue('create');
    });

    test('changes operation', () => {
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      const operationSelect = screen.getByLabelText('Operation');
      fireEvent.change(operationSelect, { target: { value: 'update' } });

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'update',
        })
      );
    });

    test('displays all operation options', () => {
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      // For MUI Select, we need to click to open the dropdown
      const operationSelect = screen.getByLabelText('Operation');
      fireEvent.mouseDown(operationSelect);

      const expectedOptions = [
        'Create Record',
        'Update Record',
        'Create or Update (Upsert)',
        'Find Record',
        'Find or Create Record',
        'Create Task',
        'Add to Campaign',
        'Create Attachment',
      ];

      expectedOptions.forEach(option => {
        expect(screen.getByText(option)).toBeInTheDocument();
      });
    });

    test('updates object API name', () => {
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      const objectField = screen.getByLabelText('Object API Name');
      fireEvent.change(objectField, { target: { value: 'Contact' } });

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          object: 'Contact',
        })
      );
    });
  });

  describe('Operation-Specific Fields', () => {
    test('shows record ID field for update operation', () => {
      const updateNode = {
        ...mockNode,
        data: { ...mockNode.data, operation: 'update' },
      };

      render(<SalesforceActionPanel node={updateNode} onNodeDataChange={mockOnNodeDataChange} />);
      expect(screen.getByLabelText('Record ID')).toBeInTheDocument();
    });

    test('shows external ID field for upsert operation', () => {
      const upsertNode = {
        ...mockNode,
        data: { ...mockNode.data, operation: 'upsert' },
      };

      render(<SalesforceActionPanel node={upsertNode} onNodeDataChange={mockOnNodeDataChange} />);
      expect(screen.getByLabelText('External ID Field')).toBeInTheDocument();
    });

    test('shows search fields for find operation', () => {
      const findNode = {
        ...mockNode,
        data: { ...mockNode.data, operation: 'find' },
      };

      render(<SalesforceActionPanel node={findNode} onNodeDataChange={mockOnNodeDataChange} />);
      expect(screen.getByLabelText('Search Field')).toBeInTheDocument();
      expect(screen.getByLabelText('Search Value')).toBeInTheDocument();
    });

    test('shows campaign fields for addToCampaign operation', () => {
      const campaignNode = {
        ...mockNode,
        data: { ...mockNode.data, operation: 'addToCampaign' },
      };

      render(<SalesforceActionPanel node={campaignNode} onNodeDataChange={mockOnNodeDataChange} />);
      expect(screen.getByLabelText('Campaign ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Member Id Field (LeadId/ContactId)')).toBeInTheDocument();
      expect(screen.getByLabelText('Member Status')).toBeInTheDocument();
    });

    test('shows attachment fields for createAttachment operation', () => {
      const attachmentNode = {
        ...mockNode,
        data: { ...mockNode.data, operation: 'createAttachment' },
      };

      render(
        <SalesforceActionPanel node={attachmentNode} onNodeDataChange={mockOnNodeDataChange} />
      );
      expect(screen.getByLabelText('Parent Record ID')).toBeInTheDocument();
      expect(screen.getByLabelText('File Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Base64 Content')).toBeInTheDocument();
      expect(screen.getByLabelText('Content Type')).toBeInTheDocument();
    });

    test('updates search field value', () => {
      const findNode = {
        ...mockNode,
        data: { ...mockNode.data, operation: 'find', search: { field: 'Email', value: '' } },
      };

      render(<SalesforceActionPanel node={findNode} onNodeDataChange={mockOnNodeDataChange} />);

      const searchField = screen.getByLabelText('Search Field');
      fireEvent.change(searchField, { target: { value: 'Name' } });

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({
            field: 'Name',
          }),
        })
      );
    });

    test('updates campaign member ID field', () => {
      const campaignNode = {
        ...mockNode,
        data: {
          ...mockNode.data,
          operation: 'addToCampaign',
          campaign: { campaignId: '', memberIdField: 'LeadId', status: 'Sent' },
        },
      };

      render(<SalesforceActionPanel node={campaignNode} onNodeDataChange={mockOnNodeDataChange} />);

      const memberIdField = screen.getByLabelText('Member Id Field (LeadId/ContactId)');
      fireEvent.change(memberIdField, { target: { value: 'ContactId' } });

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign: expect.objectContaining({
            memberIdField: 'ContactId',
          }),
        })
      );
    });
  });

  describe('Field Mapping', () => {
    test('displays existing field mappings', () => {
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      expect(screen.getByText('input.name → Name (remove)')).toBeInTheDocument();
      expect(screen.getByText('input.email → Email (remove)')).toBeInTheDocument();
    });

    test('adds new field mapping', () => {
      window.prompt = jest.fn().mockReturnValueOnce('input.company').mockReturnValueOnce('Company');

      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      const addButton = screen.getByText('Add Mapping');
      fireEvent.click(addButton);

      expect(window.prompt).toHaveBeenCalledTimes(2);
      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dataMapping: expect.objectContaining({
            fields: expect.objectContaining({
              'input.company': 'Company',
            }),
          }),
        })
      );
    });

    test('removes field mapping', () => {
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      const removeButton = screen.getByText('input.name → Name (remove)');
      fireEvent.click(removeButton);

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dataMapping: expect.objectContaining({
            fields: expect.not.objectContaining({
              'input.name': 'Name',
            }),
          }),
        })
      );
    });

    test('handles cancelled field mapping addition', () => {
      window.prompt = jest.fn().mockReturnValueOnce(null);

      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      const addButton = screen.getByText('Add Mapping');
      fireEvent.click(addButton);

      // Should not call onNodeDataChange if source field is cancelled
      expect(mockOnNodeDataChange).toHaveBeenCalledTimes(1); // Only initial call
    });
  });

  describe('Test Connection', () => {
    test('handles successful test', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'test-id' } }),
      });

      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      const testButton = screen.getByText('Test Action');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/workflows/test-salesforce-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"test":true'),
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Connection OK')).toBeInTheDocument();
      });
    });

    test('handles failed test', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Invalid credentials' }),
      });

      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      const testButton = screen.getByText('Test Action');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    test('handles network error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      const testButton = screen.getByText('Test Action');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    test('disables test button during testing', async () => {
      fetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);

      const testButton = screen.getByText('Test Action');
      fireEvent.click(testButton);

      expect(testButton).toBeDisabled();
    });
  });

  describe('Default Data Initialization', () => {
    test('initializes with default data when node data is empty', () => {
      const emptyNode = { id: 'empty-node', data: {} };

      render(<SalesforceActionPanel node={emptyNode} onNodeDataChange={mockOnNodeDataChange} />);

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: expect.objectContaining({
            accessToken: '',
            instanceUrl: '',
            apiVersion: 'v58.0',
          }),
          operation: 'create',
          object: 'Lead',
          dataMapping: expect.objectContaining({
            fields: {},
          }),
          errorHandling: expect.objectContaining({
            retryOnError: true,
            retryCount: 3,
            retryDelay: 1000,
          }),
        })
      );
    });

    test('merges existing data with defaults', () => {
      const partialNode = {
        id: 'partial-node',
        data: {
          connection: { instanceUrl: 'https://custom.sf.com' },
          operation: 'update',
        },
      };

      render(<SalesforceActionPanel node={partialNode} onNodeDataChange={mockOnNodeDataChange} />);

      // The component should merge the provided data with defaults
      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: expect.objectContaining({
            instanceUrl: 'https://custom.sf.com',
          }),
          operation: 'update',
        })
      );
    });
  });

  describe('Accordion Sections', () => {
    test('renders connection accordion', () => {
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
      expect(screen.getByText('Connection')).toBeInTheDocument();
    });

    test('renders operation accordion', () => {
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
      // The accordion should contain the Operation section
      expect(screen.getByText('Operation')).toBeInTheDocument();
    });

    test('renders field mapping accordion', () => {
      render(<SalesforceActionPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />);
      expect(screen.getByText('Field Mapping')).toBeInTheDocument();
    });
  });

  describe('Complex Data Updates', () => {
    test('updates attachment configuration', () => {
      const attachmentNode = {
        ...mockNode,
        data: {
          ...mockNode.data,
          operation: 'createAttachment',
          attachment: {
            parentId: '',
            fileName: '',
            contentBase64: '',
            contentType: 'application/octet-stream',
          },
        },
      };

      render(
        <SalesforceActionPanel node={attachmentNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      const parentIdField = screen.getByLabelText('Parent Record ID');
      fireEvent.change(parentIdField, { target: { value: 'parent-123' } });

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          attachment: expect.objectContaining({
            parentId: 'parent-123',
          }),
        })
      );
    });

    test('updates external ID field for findOrCreate operation', () => {
      const findOrCreateNode = {
        ...mockNode,
        data: {
          ...mockNode.data,
          operation: 'findOrCreate',
          externalIdField: 'External_Id__c',
        },
      };

      render(
        <SalesforceActionPanel node={findOrCreateNode} onNodeDataChange={mockOnNodeDataChange} />
      );

      const externalIdField = screen.getByLabelText('External ID Field');
      fireEvent.change(externalIdField, { target: { value: 'Custom_External_Id__c' } });

      expect(mockOnNodeDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          externalIdField: 'Custom_External_Id__c',
        })
      );
    });
  });
});
