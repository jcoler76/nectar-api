import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

interface ApiClientConfig {
  baseURL: string
  apiKey?: string
  timeout?: number
}

class ApiClient {
  private client: AxiosInstance

  constructor(config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'X-API-Key': config.apiKey })
      }
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error(`API Error [${error.response.status}]:`, error.response.data)
        } else if (error.request) {
          console.error('API Error: No response received', error.request)
        } else {
          console.error('API Error:', error.message)
        }
        return Promise.reject(error)
      }
    )
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  async graphql<T = any>(query: string, variables?: any): Promise<T> {
    const response = await this.client.post<{ data: T; errors?: any[] }>('/graphql', {
      query,
      variables
    })

    if (response.data.errors) {
      throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`)
    }

    return response.data.data
  }
}

const mainApiClient = new ApiClient({
  baseURL: process.env.MAIN_API_URL || 'http://localhost:3001',
  apiKey: process.env.MAIN_API_KEY
})

export { ApiClient, mainApiClient }