import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import ZoomInfoContactDiscoveryPanel from './ZoomInfoContactDiscoveryPanel';

// Mock fetch
global.fetch = jest.fn();

const mockNode = {
  id: 'test-node',
  data: {
    credentials: {
      type: 'apikey',
      apiKey: 'test-key',
    },
    searchCriteria: {
      companyDomain: 'test.com',
      limit: 25,
      includeCompanyData: true,
    },
    outputFormat: 'enriched',
    enrichmentOptions: {
      customFields: {},
    },
  },
};

const mockOnNodeDataChange = jest.fn();

describe('ZoomInfoContactDiscoveryPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  test('renders without crashing', () => {
    render(
      <ZoomInfoContactDiscoveryPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
    );
    expect(screen.getByText('ZoomInfo Contact Discovery Configuration')).toBeInTheDocument();
  });

  test('displays search criteria section', () => {
    render(
      <ZoomInfoContactDiscoveryPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
    );
    expect(screen.getByText('Search Criteria')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test.com')).toBeInTheDocument();
  });

  test.skip('handles output format change', () => {
    render(
      <ZoomInfoContactDiscoveryPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
    );

    // First expand the Output Configuration accordion
    const outputConfigAccordion = screen.getByText('Output Configuration');
    fireEvent.click(outputConfigAccordion);

    // Now find the select element
    const formatSelect = screen.getByDisplayValue('Enriched (Additional contact details)');
    fireEvent.mouseDown(formatSelect);

    const basicOption = screen.getByText('Basic (Name, Email, Title, Company)');
    fireEvent.click(basicOption);

    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test('allows adding custom field mappings', () => {
    window.prompt = jest.fn().mockReturnValueOnce('job_title').mockReturnValueOnce('title');

    render(
      <ZoomInfoContactDiscoveryPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
    );

    const addButton = screen.getByText('Add Custom Field Mapping');
    fireEvent.click(addButton);

    expect(window.prompt).toHaveBeenCalledTimes(2);
    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test('handles test connection', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Test successful',
        data: { contacts: [{ name: 'John Doe', email: 'john@test.com' }] },
      }),
    });

    render(
      <ZoomInfoContactDiscoveryPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
    );

    const testButton = screen.getByText('Test Contact Discovery');
    fireEvent.click(testButton);

    expect(screen.getByText('Testing Discovery...')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/workflows/test-zoominfo-contact-discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials: mockNode.data.credentials,
          searchCriteria: {
            ...mockNode.data.searchCriteria,
            limit: 5,
          },
        }),
      });
    });
  });

  test('validates search criteria inputs', () => {
    render(
      <ZoomInfoContactDiscoveryPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
    );

    const limitInput = screen.getByDisplayValue('25');
    fireEvent.change(limitInput, { target: { value: '50' } });

    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });

  test.skip('handles seniority level selection', () => {
    render(
      <ZoomInfoContactDiscoveryPanel node={mockNode} onNodeDataChange={mockOnNodeDataChange} />
    );

    // First expand the Search Criteria accordion
    const searchCriteriaAccordion = screen.getByText('Search Criteria');
    fireEvent.click(searchCriteriaAccordion);

    // Now find the seniority select element
    const senioritySelect = screen.getByLabelText('Seniority Level');
    fireEvent.mouseDown(senioritySelect);

    const vpOption = screen.getByText('VP');
    fireEvent.click(vpOption);

    expect(mockOnNodeDataChange).toHaveBeenCalled();
  });
});
