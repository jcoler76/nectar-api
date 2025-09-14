// Real Performance tests for ServiceList component - NO MOCKS
import { screen, waitFor } from '@testing-library/react';

import ServiceList from '../services/ServiceList';
import {
  RealApiTestUtils,
  cleanupTestEnvironment,
  generateTestConnection,
  generateTestService,
  renderWithProviders,
  setupTestEnvironment,
} from '../utils/testUtils';

// NO MOCKS - Using real implementations

describe('ServiceList Real Performance Tests', () => {
  let apiUtils;

  beforeAll(async () => {
    setupTestEnvironment();
    apiUtils = new RealApiTestUtils();

    // Create and login test user for real API calls
    const testUser = {
      email: 'performance-test@example.com',
      password: 'testpassword123',
      name: 'Performance Test User',
    };

    await apiUtils.createUser(testUser);
    await apiUtils.login(testUser.email, testUser.password);

    // Real performance test environment ready
  }, 30000);

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    // Clean up storage between tests
    localStorage.clear();
    sessionStorage.clear();
  });

  test('should render with real API calls within performance threshold', async () => {
    // Create a few real services for testing
    const services = [
      generateTestService({ name: 'Performance Test Service 1' }),
      generateTestService({ name: 'Performance Test Service 2' }),
      generateTestService({ name: 'Performance Test Service 3' }),
    ];

    for (const service of services) {
      await apiUtils.createService(service);
    }

    const startTime = performance.now();

    renderWithProviders(<ServiceList />);

    // Wait for real API calls to complete and services to render
    await waitFor(
      () => {
        expect(screen.getByText(/services/i)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Check if our test service rendered
    expect(screen.getByText('Performance Test Service 1')).toBeInTheDocument();

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Real API calls take longer, so adjust threshold
    expect(renderTime).toBeLessThan(8000); // 8 seconds for real API calls
  }, 15000);

  test('should handle real large datasets efficiently', async () => {
    // Create real large dataset via API calls
    const largeServiceList = Array.from({ length: 50 }, (_, i) =>
      generateTestService({
        name: `Large Dataset Service ${i + 1}`,
        label: `Label ${i + 1}`,
        description: `Description for service ${i + 1}`,
      })
    );

    const largeConnectionList = Array.from({ length: 25 }, (_, i) =>
      generateTestConnection({ name: `Connection ${i + 1}` })
    );

    // Create connections first (services might reference them)
    // Creating real test connections
    for (const connection of largeConnectionList) {
      await apiUtils.createConnection(connection);
    }

    // Create services
    // Creating real test services
    const batchSize = 5; // Create in smaller batches to avoid overwhelming the API
    const createServiceBatch = async batch => {
      return Promise.all(batch.map(service => apiUtils.createService(service)));
    };

    for (let i = 0; i < largeServiceList.length; i += batchSize) {
      const batch = largeServiceList.slice(i, i + batchSize);
      await createServiceBatch(batch);
    }

    const startTime = performance.now();

    renderWithProviders(<ServiceList />);

    // Wait for all real services to load and render
    await waitFor(
      () => {
        expect(screen.getByText(/services/i)).toBeInTheDocument();
      },
      { timeout: 20000 }
    );

    // Verify some of our test services loaded
    expect(screen.getByText('Large Dataset Service 1')).toBeInTheDocument();
    expect(screen.getByText('Large Dataset Service 25')).toBeInTheDocument();

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Real large datasets take longer, adjust threshold accordingly
    expect(renderTime).toBeLessThan(15000); // 15 seconds for real large dataset
  }, 45000); // Longer timeout for creating and loading real data
});
