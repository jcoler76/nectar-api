const { gql } = require('apollo-server-express');

const workflowTypeDefs = gql`
  # Workflow Node Definition
  type WorkflowNode {
    id: String!
    type: String!
    data: JSON!
    position: JSON!
  }

  # Workflow Edge Definition
  type WorkflowEdge {
    id: String!
    source: String!
    target: String!
    sourceHandle: String
    targetHandle: String
  }

  # Workflow Step (execution result)
  type WorkflowStep {
    status: String!
    result: JSON
    error: String
  }

  # Main Workflow Type
  type Workflow implements Node {
    id: ID!
    name: String!
    active: Boolean!
    schedule: String
    nodes: [WorkflowNode!]!
    edges: [WorkflowEdge!]!
    userId: ID!
    user: User
    createdAt: Date!
    updatedAt: Date!
    # Related data
    runs(first: Int = 10, after: String, status: WorkflowRunStatus): WorkflowRunConnection
    lastRun: WorkflowRun
    totalRuns: Int!
    successRate: Float!
  }

  # Workflow Run Status Enum
  enum WorkflowRunStatus {
    RUNNING
    SUCCEEDED
    FAILED
  }

  # Workflow Run Type
  type WorkflowRun implements Node {
    id: ID!
    workflowId: ID!
    workflow: Workflow!
    status: WorkflowRunStatus!
    startedAt: Date!
    finishedAt: Date
    trigger: JSON
    steps: JSON!
    duration: Int
    createdAt: Date!
    updatedAt: Date!
  }

  # Workflow Connection Types
  type WorkflowConnection {
    edges: [WorkflowEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type WorkflowEdge {
    node: Workflow!
    cursor: String!
  }

  type WorkflowRunConnection {
    edges: [WorkflowRunEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type WorkflowRunEdge {
    node: WorkflowRun!
    cursor: String!
  }

  # Input Types
  input WorkflowNodeInput {
    id: String!
    type: String!
    data: JSON!
    position: JSON!
  }

  input WorkflowEdgeInput {
    id: String!
    source: String!
    target: String!
    sourceHandle: String
    targetHandle: String
  }

  input CreateWorkflowInput {
    name: String!
    active: Boolean = false
    schedule: String
    nodes: [WorkflowNodeInput!]!
    edges: [WorkflowEdgeInput!]!
  }

  input UpdateWorkflowInput {
    name: String
    active: Boolean
    schedule: String
    nodes: [WorkflowNodeInput!]
    edges: [WorkflowEdgeInput!]
  }

  input WorkflowFilters {
    name: String
    active: Boolean
    userId: ID
    hasSchedule: Boolean
    createdAfter: Date
    createdBefore: Date
  }

  input WorkflowRunFilters {
    workflowId: ID
    status: WorkflowRunStatus
    startedAfter: Date
    startedBefore: Date
  }

  # Workflow Execution Result
  type WorkflowExecutionResult {
    success: Boolean!
    runId: ID
    message: String
    executionTime: Int
  }

  # Workflow Statistics
  type WorkflowStats {
    totalWorkflows: Int!
    activeWorkflows: Int!
    totalRuns: Int!
    successfulRuns: Int!
    failedRuns: Int!
    averageExecutionTime: Float
    mostActiveWorkflow: Workflow
    recentFailures: [WorkflowRun!]!
  }

  # Subscription Types for Real-time Updates
  type WorkflowRunUpdate {
    runId: ID!
    workflowId: ID!
    status: WorkflowRunStatus!
    step: String
    progress: Float
    error: String
    result: JSON
  }

  # Extend Root Types
  extend type Query {
    # Workflow Queries
    workflow(id: ID!): Workflow
    workflows(
      first: Int = 10
      after: String
      filters: WorkflowFilters
      orderBy: SortOrder = DESC
    ): WorkflowConnection!

    # Workflow Run Queries
    workflowRun(id: ID!): WorkflowRun
    workflowRuns(
      first: Int = 10
      after: String
      filters: WorkflowRunFilters
      orderBy: SortOrder = DESC
    ): WorkflowRunConnection!

    # My workflows (for current user)
    myWorkflows(first: Int = 10, after: String, active: Boolean): WorkflowConnection!

    # Workflow Statistics
    workflowStats: WorkflowStats!
  }

  extend type Mutation {
    # Workflow CRUD
    createWorkflow(input: CreateWorkflowInput!): Workflow!
    updateWorkflow(id: ID!, input: UpdateWorkflowInput!): Workflow!
    deleteWorkflow(id: ID!): Boolean!

    # Workflow Execution
    executeWorkflow(id: ID!, triggerData: JSON): WorkflowExecutionResult!
    stopWorkflowRun(runId: ID!): Boolean!

    # Workflow Management
    activateWorkflow(id: ID!): Workflow!
    deactivateWorkflow(id: ID!): Workflow!
    scheduleWorkflow(id: ID!, schedule: String!): Workflow!
    unscheduleWorkflow(id: ID!): Workflow!

    # Workflow Testing
    testWorkflowConnection(id: ID!): WorkflowExecutionResult!
    validateWorkflow(id: ID!): WorkflowExecutionResult!
  }

  extend type Subscription {
    # Real-time workflow execution updates
    workflowRunUpdates(workflowId: ID): WorkflowRunUpdate!
    workflowRunStarted(userId: ID): WorkflowRun!
    workflowRunCompleted(userId: ID): WorkflowRun!
    workflowRunFailed(userId: ID): WorkflowRun!

    # Workflow status changes
    workflowStatusChanged(userId: ID): Workflow!
  }
`;

module.exports = workflowTypeDefs;
