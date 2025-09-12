type GraphQLError = {
  message: string
  path?: (string | number)[]
  code?: string
}

type GraphQLResponse<T> = {
  data?: T
  errors?: GraphQLError[]
}

const GRAPHQL_BASE_URL = (
  (import.meta as unknown as { env?: { VITE_GRAPHQL_URL?: string; VITE_API_BASE_URL?: string } }).env?.VITE_GRAPHQL_URL ||
  (
    ((import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
      ? `${(import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env!.VITE_API_BASE_URL}/graphql`
      : 'http://localhost:3001/graphql')
  )
)

export async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('nectar_admin_token')

  const resp = await fetch(GRAPHQL_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
