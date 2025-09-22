import { useAuth } from '../contexts/AuthContext'

type GraphQLError = {
  message: string
  path?: (string | number)[]
  code?: string
}

type GraphQLResponse<T> = {
  data?: T
  errors?: GraphQLError[]
}

export function useGraphQL() {
  const { apiToken } = useAuth()

  const GRAPHQL_BASE_URL = (
    (import.meta as unknown as { env?: { VITE_GRAPHQL_URL?: string; VITE_API_BASE_URL?: string } }).env?.VITE_GRAPHQL_URL ||
    (
      ((import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
        ? `${(import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env!.VITE_API_BASE_URL}/graphql`
        : 'http://localhost:3001/graphql')
    )
  )

  const graphqlRequest = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    if (!apiToken) {
      throw new Error('No authentication token available')
    }

    const resp = await fetch(GRAPHQL_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`GraphQL network error ${resp.status}: ${text}`)
    }

    const json = (await resp.json()) as GraphQLResponse<T>
    if (json.errors && json.errors.length) {
      const err = json.errors[0]
      throw new Error(err.message || 'GraphQL error')
    }
    if (!json.data) throw new Error('No data returned from GraphQL')
    return json.data
  }

  return { graphqlRequest }
}