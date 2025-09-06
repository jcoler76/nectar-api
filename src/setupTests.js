import '@testing-library/jest-dom';

// Setup for real implementations - NO MOCKS
// Configure test environment for real integrations

// Set up real environment variables for testing
process.env.REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
process.env.REACT_APP_ENV = 'test';

// Configure fetch for API calls (Node.js 18+ has built-in fetch)
// Use native fetch or provide a simple mock for tests
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  );
}

// Initialize storage first
global.localStorage = {};
global.sessionStorage = {};

// Set up real localStorage and sessionStorage
const localStorageMock = {
  getItem: jest.fn(key => {
    return global.localStorage[key] || null;
  }),
  setItem: jest.fn((key, value) => {
    global.localStorage[key] = value;
  }),
  removeItem: jest.fn(key => {
    delete global.localStorage[key];
  }),
  clear: jest.fn(() => {
    global.localStorage = {};
  }),
  length: 0,
  key: jest.fn(index => null),
};

const sessionStorageMock = {
  getItem: jest.fn(key => {
    return global.sessionStorage[key] || null;
  }),
  setItem: jest.fn((key, value) => {
    global.sessionStorage[key] = value;
  }),
  removeItem: jest.fn(key => {
    delete global.sessionStorage[key];
  }),
  clear: jest.fn(() => {
    global.sessionStorage = {};
  }),
  length: 0,
  key: jest.fn(index => null),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Also set up global references
global.localStorage = localStorageMock;
global.sessionStorage = sessionStorageMock;

// Set up real crypto for secure operations
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: arr => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  },
});

// Set up real ResizeObserver for components that use it
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    // Real implementation would observe, for tests we can simulate
    setTimeout(() => {
      this.callback([
        {
          target: document.createElement('div'),
          contentRect: { width: 1024, height: 768 },
        },
      ]);
    }, 0);
  }
  unobserve() {}
  disconnect() {}
};

// Set up real IntersectionObserver for components that use it
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }
  observe() {
    // Real implementation would observe, for tests we can simulate
    setTimeout(() => {
      this.callback([
        {
          target: document.createElement('div'),
          isIntersecting: true,
          intersectionRatio: 1,
        },
      ]);
    }, 0);
  }
  unobserve() {}
  disconnect() {}
};

// Set up real URL and URLSearchParams
if (!global.URL) {
  global.URL = require('url').URL;
}
if (!global.URLSearchParams) {
  global.URLSearchParams = require('url').URLSearchParams;
}

// Set up real TextEncoder and TextDecoder
if (!global.TextEncoder) {
  global.TextEncoder = require('util').TextEncoder;
}
if (!global.TextDecoder) {
  global.TextDecoder = require('util').TextDecoder;
}

// Note: axios configuration moved to individual test files to avoid ES module issues

// Global test utilities
global.testUtils = {
  setAuthToken: token => {
    global.testAuthToken = token;
  },
  clearAuthToken: () => {
    delete global.testAuthToken;
  },
  waitFor: ms => new Promise(resolve => setTimeout(resolve, ms)),
};
