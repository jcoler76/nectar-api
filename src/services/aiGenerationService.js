import api from './api';

/**
 * AI Generation Service
 * Handles API communication for AI schema generation
 */
class AIGenerationService {
  /**
   * Generate artifacts for a service
   */
  async generateArtifacts(serviceId, options = {}) {
    try {
      const response = await api.post(`/api/ai-generation/${serviceId}/generate`, {
        artifactTypes: options.artifactTypes,
        regenerate: options.regenerate || false,
        includeBusinessContext: options.includeBusinessContext !== false,
        options: options.customOptions || {},
      });
      return response.data;
    } catch (error) {
      console.error('Generate artifacts error:', error);
      throw error;
    }
  }

  /**
   * Get generation status for a service
   */
  async getGenerationStatus(serviceId) {
    try {
      const response = await api.get(`/api/ai-generation/${serviceId}/status`);
      return response.data;
    } catch (error) {
      console.error('Get generation status error:', error);
      throw error;
    }
  }

  /**
   * Get generated artifacts with filtering
   */
  async getArtifacts(serviceId, options = {}) {
    try {
      const params = new URLSearchParams();

      if (options.artifactType) params.append('artifactType', options.artifactType);
      if (options.status) params.append('status', options.status);
      if (options.latestOnly !== undefined) params.append('latestOnly', options.latestOnly);
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);

      const response = await api.get(`/api/ai-generation/${serviceId}/artifacts?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get artifacts error:', error);
      throw error;
    }
  }

  /**
   * Get detailed artifact information
   */
  async getArtifactDetails(serviceId, artifactId) {
    try {
      const response = await api.get(`/api/ai-generation/${serviceId}/artifacts/${artifactId}`);
      return response.data;
    } catch (error) {
      console.error('Get artifact details error:', error);
      throw error;
    }
  }

  /**
   * Download artifact
   */
  async downloadArtifact(serviceId, artifactType, format = 'raw') {
    try {
      const params = new URLSearchParams();
      if (format) params.append('format', format);

      const response = await api.get(
        `/api/ai-generation/${serviceId}/download/${artifactType}?${params}`,
        {
          responseType: 'blob',
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Get filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${artifactType}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Download artifact error:', error);
      throw error;
    }
  }

  /**
   * Regenerate artifacts
   */
  async regenerateArtifacts(serviceId, options = {}) {
    try {
      const response = await api.put(`/api/ai-generation/${serviceId}/regenerate`, {
        artifactTypes: options.artifactTypes || [],
        options: options.customOptions || {},
      });
      return response.data;
    } catch (error) {
      console.error('Regenerate artifacts error:', error);
      throw error;
    }
  }

  /**
   * Delete artifacts
   */
  async deleteArtifacts(serviceId, options = {}) {
    try {
      const response = await api.delete(`/api/ai-generation/${serviceId}/artifacts`, {
        data: {
          artifactType: options.artifactType,
          confirmDelete: true,
          keepLatest: options.keepLatest || false,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Delete artifacts error:', error);
      throw error;
    }
  }

  /**
   * Validate artifact
   */
  async validateArtifact(serviceId, artifactId) {
    try {
      const response = await api.post(
        `/api/ai-generation/${serviceId}/artifacts/${artifactId}/validate`
      );
      return response.data;
    } catch (error) {
      console.error('Validate artifact error:', error);
      throw error;
    }
  }

  /**
   * Record deployment
   */
  async deployArtifact(serviceId, artifactId, environment, projectName) {
    try {
      const response = await api.post(
        `/api/ai-generation/${serviceId}/artifacts/${artifactId}/deploy`,
        {
          environment,
          projectName,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Deploy artifact error:', error);
      throw error;
    }
  }

  /**
   * Get artifact history
   */
  async getArtifactHistory(serviceId, artifactType) {
    try {
      const response = await api.get(`/api/ai-generation/${serviceId}/artifacts`, {
        params: {
          artifactType,
          latestOnly: false,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Get artifact history error:', error);
      throw error;
    }
  }

  /**
   * Get generation statistics
   */
  async getGenerationStats(serviceId) {
    try {
      const response = await api.get(`/api/ai-generation/${serviceId}/status`);
      return response.data.statistics || {};
    } catch (error) {
      console.error('Get generation stats error:', error);
      throw error;
    }
  }

  /**
   * Batch operations
   */
  async batchGenerateArtifacts(serviceIds, artifactTypes) {
    try {
      const promises = serviceIds.map(serviceId =>
        this.generateArtifacts(serviceId, { artifactTypes })
      );
      const results = await Promise.allSettled(promises);

      return {
        success: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        results: results.map((r, i) => ({
          serviceId: serviceIds[i],
          status: r.status,
          result: r.status === 'fulfilled' ? r.value : null,
          error: r.status === 'rejected' ? r.reason : null,
        })),
      };
    } catch (error) {
      console.error('Batch generate error:', error);
      throw error;
    }
  }

  /**
   * Check if OpenAI API is configured
   */
  async checkAPIConfiguration() {
    try {
      // This would be implemented on the backend
      const response = await api.get('/api/ai-generation/check-config');
      return response.data;
    } catch (error) {
      console.error('Check API configuration error:', error);
      return { configured: false };
    }
  }

  /**
   * Get supported artifact types
   */
  getArtifactTypes() {
    return [
      {
        id: 'graphql_schema',
        name: 'GraphQL Schema',
        description: 'Type definitions for GraphQL API',
        fileExtension: 'graphql',
      },
      {
        id: 'graphql_resolvers',
        name: 'GraphQL Resolvers',
        description: 'Resolver implementations for GraphQL',
        fileExtension: 'js',
      },
      {
        id: 'prisma_schema',
        name: 'Prisma Schema',
        description: 'Database models for Prisma ORM',
        fileExtension: 'prisma',
      },
      {
        id: 'typescript_types',
        name: 'TypeScript Types',
        description: 'Type definitions for TypeScript',
        fileExtension: 'ts',
      },
      {
        id: 'documentation',
        name: 'Documentation',
        description: 'Developer documentation and guides',
        fileExtension: 'md',
      },
    ];
  }

  /**
   * Get download formats
   */
  getDownloadFormats() {
    return [
      { value: 'raw', label: 'Raw' },
      { value: 'json', label: 'JSON' },
      { value: 'yaml', label: 'YAML' },
      { value: 'markdown', label: 'Markdown' },
    ];
  }
}

const aiGenerationService = new AIGenerationService();
export default aiGenerationService;
