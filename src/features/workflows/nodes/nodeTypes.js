import ArticleIcon from '@mui/icons-material/Article';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { default as CloudUploadIcon, default as FtpIcon } from '@mui/icons-material/CloudUpload';
import CodeIcon from '@mui/icons-material/Code';
import ContactPageIcon from '@mui/icons-material/ContactPage';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import HttpIcon from '@mui/icons-material/Http';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SpeakerNotesIcon from '@mui/icons-material/SpeakerNotes';
import StorageIcon from '@mui/icons-material/Storage';
import WebhookIcon from '@mui/icons-material/Webhook';

import ApiSequencePanel from './panels/ApiSequencePanel';
import ApprovalPanel from './panels/ApprovalPanel';
import CRMIntegrationPanel from './panels/CRMIntegrationPanel';
import CodePanel from './panels/CodePanel';
import CsvParsePanel from './panels/CsvParsePanel.tsx';
import DatabaseTriggerPanel from './panels/DatabaseTriggerPanel';
import DelayPanel from './panels/DelayPanel';
import EmailActionPanel from './panels/EmailActionPanel';
import EmailTriggerPanel from './panels/EmailTriggerPanel';
import FileGenerationPanel from './panels/FileGenerationPanel';
import FileTriggerPanel from './panels/FileTriggerPanel';
import FormTriggerPanel from './panels/FormTriggerPanel';
import FtpUploadPanel from './panels/FtpUploadPanel';
import GenericNodePanel from './panels/GenericNodePanel';
import GraphQLExecutePanel from './panels/GraphQLExecutePanel.tsx';
import HttpRequestPanel from './panels/HttpRequestPanel';
import HubSpotActionPanel from './panels/HubSpotActionPanel.jsx';
import HubSpotRecordTriggerPanel from './panels/HubSpotRecordTriggerPanel.jsx';
import IdempotencyPanel from './panels/IdempotencyPanel.tsx';
import LoggerPanel from './panels/LoggerPanel';
import OpenAiPanel from './panels/OpenAiPanel';
import RouterPanel from './panels/RouterPanel';
import S3BucketTriggerPanel from './panels/S3BucketTriggerPanel';
import SalesforceActionPanel from './panels/SalesforceActionPanel.jsx';
import SalesforceOutboundMessageTriggerPanel from './panels/SalesforceOutboundMessageTriggerPanel.jsx';
import SalesforceRecordTriggerPanel from './panels/SalesforceRecordTriggerPanel.jsx';
import SchedulerTriggerPanel from './panels/SchedulerTriggerPanel';
import SqlServerAdminPanel from './panels/SqlServerAdminPanel.tsx';
import TeamsNotifyPanel from './panels/TeamsNotifyPanel.tsx';
import Template20ProcedurePanel from './panels/Template20ProcedurePanel.tsx';
import TransformPanel from './panels/TransformPanel.tsx';
import WebhookTriggerPanel from './panels/WebhookTriggerPanel';
import ZoomInfoContactDiscoveryPanel from './panels/ZoomInfoContactDiscoveryPanel';
import ZoomInfoIntentTriggerPanel from './panels/ZoomInfoIntentTriggerPanel';
// We will create these panel components in subsequent steps
// import ApprovalPanel from './panels/ApprovalPanel';
// import LoggerPanel from './panels/LoggerPanel';

export const NODE_TYPES = {
  // Generic Node for unrecognized types
  'generic:unrecognized': {
    type: 'generic:unrecognized',
    name: 'Unrecognized Node',
    description: 'An old or unknown node type that needs to be updated.',
    category: 'system',
    icon: HelpOutlineIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => GenericNodePanel,
    defaultData: {
      label: 'Unrecognized',
    },
  },
  // Trigger Nodes
  'trigger:webhook': {
    type: 'trigger:webhook',
    name: 'Webhook',
    description: 'Triggers the workflow when a webhook is received.',
    category: 'triggers',
    icon: WebhookIcon,
    inputs: 0,
    outputs: 1,
    getPropertiesComponent: () => WebhookTriggerPanel,
    defaultData: {
      label: 'Webhook',
      event: 'catchHook',
      httpMethod: 'POST',
      authType: 'none',
      headerName: 'X-API-KEY',
      apiKeyValue: '',
    },
  },
  'trigger:schedule': {
    type: 'trigger:schedule',
    name: 'Scheduler',
    description: 'Triggers the workflow on a schedule (e.g., every day at 5pm).',
    category: 'triggers',
    icon: ScheduleIcon,
    inputs: 0,
    outputs: 1,
    getPropertiesComponent: () => SchedulerTriggerPanel,
    defaultData: {
      label: 'Scheduler',
      pattern: '0 5 * * *', // Every day at 5pm
      timezone: 'America/New_York', // Default to Eastern Time
    },
  },
  // HubSpot Triggers
  'trigger:hubspot:record': {
    type: 'trigger:hubspot:record',
    name: 'HubSpot Record Trigger',
    description: 'Triggers when HubSpot records are created or updated.',
    category: 'triggers',
    icon: ContactPageIcon,
    inputs: 0,
    outputs: 1,
    getPropertiesComponent: () => HubSpotRecordTriggerPanel,
    defaultData: {
      label: 'HubSpot Record Trigger',
      connection: {
        accessToken: '',
        baseUrl: 'https://api.hubapi.com',
        apiVersion: 'v3',
      },
      eventType: 'new',
      object: 'contact',
      pollingInterval: 300000,
      propertiesToMonitor: [],
      filters: '',
      advanced: {
        batchSize: 50,
        includeAssociations: false,
      },
    },
  },
  'trigger:form': {
    type: 'trigger:form',
    name: 'Form Submission',
    description: 'Triggers the workflow when a form is submitted.',
    category: 'triggers',
    icon: ArticleIcon,
    inputs: 0,
    outputs: 1,
    getPropertiesComponent: () => FormTriggerPanel,
    defaultData: {
      label: 'Form Submission',
      formId: '', // This will be generated or user-defined
      redirectUrl: '',
      passDataToRedirect: false,
    },
  },
  'trigger:email': {
    type: 'trigger:email',
    name: 'Email',
    description: 'Triggers the workflow when an email is received.',
    category: 'triggers',
    icon: EmailIcon,
    inputs: 0,
    outputs: 1,
    getPropertiesComponent: () => EmailTriggerPanel,
    defaultData: {
      label: 'Email Trigger',
      emailAddress: '', // This will be dynamically generated
    },
  },
  'trigger:file': {
    type: 'trigger:file',
    name: 'File Upload',
    description: 'Triggers the workflow when a file is uploaded.',
    category: 'triggers',
    icon: CloudUploadIcon,
    inputs: 0,
    outputs: 1,
    getPropertiesComponent: () => FileTriggerPanel,
    defaultData: {
      label: 'File Upload Trigger',
    },
  },
  'trigger:database': {
    type: 'trigger:database',
    name: 'Database',
    description: 'Triggers the workflow based on database events.',
    category: 'triggers',
    icon: StorageIcon,
    inputs: 0,
    outputs: 1,
    getPropertiesComponent: () => DatabaseTriggerPanel,
    defaultData: {
      label: 'Database Trigger',
      eventType: 'newRow', // newRow, updatedRow
      connectionId: '',
      database: '',
      table: '',
      dateColumn: '', // for newRow detection
      column: '', // for updatedRow
      timeadd: '', // timezone offset in minutes from EST

      // CDC Optimization Settings
      cdcMode: false,
      batchSize: 5000,
      cleanupStrategy: 'time-based', // 'time-based', 'processed-marker'
      enableBatching: true,

      // Adaptive Polling Configuration
      minInterval: 5000, // 5 seconds
      baseInterval: 30000, // 30 seconds
      maxInterval: 300000, // 5 minutes
    },
  },
  'trigger:s3Bucket': {
    type: 'trigger:s3Bucket',
    name: 'S3 Bucket Monitor',
    description:
      'Monitors an S3 bucket for new files and triggers the workflow when files are uploaded.',
    category: 'triggers',
    icon: CloudSyncIcon,
    inputs: 0,
    outputs: 1,
    getPropertiesComponent: () => S3BucketTriggerPanel,
    defaultData: {
      label: 'S3 Bucket Monitor',
      bucketName: '',
      awsRegion: 'us-east-1',
      awsAccessKeyId: '',
      awsSecretAccessKey: '',
      filePattern: '*',
      pollingInterval: 300000, // 5 minutes
      processedFilesTracker: {},
      moveAfterProcessing: false,
      deleteAfterProcessing: false,
      prefix: '',
      maxFiles: 10,
    },
  },
  'trigger:zoominfo:intent': {
    type: 'trigger:zoominfo:intent',
    name: 'ZoomInfo Intent Signals',
    description: 'Triggers when companies show purchase intent signals in ZoomInfo.',
    category: 'triggers',
    icon: BusinessIcon,
    inputs: 0,
    outputs: 1,
    getPropertiesComponent: () => ZoomInfoIntentTriggerPanel,
    defaultData: {
      label: 'ZoomInfo Intent Trigger',
      credentials: {
        type: 'apikey',
        apiKey: '',
        username: '',
        password: '',
        privateKey: '',
        clientId: '',
      },
      intentTopics: [],
      signalStrength: 'moderate',
      companyFilters: {
        industry: '',
        companySize: '',
        location: '',
        technologyStack: [],
      },
      pollingInterval: 900000,
      advancedSettings: {
        batchSize: 50,
        includeContactData: true,
        minimumConfidenceScore: 0.7,
      },
    },
  },
  'trigger:salesforce:record': {
    type: 'trigger:salesforce:record',
    name: 'Salesforce Record Trigger',
    description: 'Triggers on new or updated Salesforce records for a chosen object.',
    category: 'triggers',
    icon: BusinessIcon,
    inputs: 0,
    outputs: 1,
    getPropertiesComponent: () => SalesforceRecordTriggerPanel,
    defaultData: {
      label: 'Salesforce Record Trigger',
      connection: {
        accessToken: '',
        instanceUrl: '',
        apiVersion: 'v58.0',
      },
      eventType: 'new',
      object: 'Lead',
      pollingInterval: 300000,
      fieldsToMonitor: [],
      soqlWhere: '',
      advanced: {
        batchSize: 50,
        includeSystemFields: false,
      },
    },
  },
  'trigger:salesforce:outboundMessage': {
    type: 'trigger:salesforce:outboundMessage',
    name: 'Salesforce Outbound Message',
    description: 'Triggers on Salesforce Outbound Message (SOAP webhook).',
    category: 'triggers',
    icon: WebhookIcon,
    inputs: 0,
    outputs: 1,
    getPropertiesComponent: () => SalesforceOutboundMessageTriggerPanel,
    defaultData: {
      label: 'Salesforce Outbound Message',
      auth: {
        type: 'basic',
        username: '',
        password: '',
      },
      allowedIPs: [
        // Common Salesforce outbound CIDRs (example; customize per org/region)
      ],
      requireTLS: true,
      responseAck: true,
    },
  },
  // Action Nodes
  'action:httpRequest': {
    type: 'action:httpRequest',
    name: 'HTTP Request',
    description: 'Make a GET, POST, PUT or other HTTP request to an external URL.',
    category: 'actions',
    icon: HttpIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => HttpRequestPanel,
    defaultData: {
      label: 'HTTP Request',
      method: 'POST',
      url: '',
      headers: [],
      body: '',
      auth: {
        type: 'none',
      },
    },
  },
  // HubSpot Actions
  'action:hubspot:record': {
    type: 'action:hubspot:record',
    name: 'HubSpot Action',
    description: 'Create, update, find, or associate HubSpot records.',
    category: 'actions',
    icon: BusinessIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => HubSpotActionPanel,
    defaultData: {
      label: 'HubSpot Action',
      connection: {
        accessToken: '',
        baseUrl: 'https://api.hubapi.com',
        apiVersion: 'v3',
      },
      object: 'contact',
      operation: 'create',
      search: {
        property: 'email',
        value: '',
        createIfNotFound: false,
      },
      association: {
        fromObject: 'contact',
        toObject: 'company',
        associationType: 'contact_to_company',
      },
      list: {
        listId: '',
      },
      note: {
        content: '',
      },
      email: {
        subject: '',
        html: '',
        text: '',
        direction: 'OUTGOING',
        status: 'SENT',
        associate: { object: 'contact', objectId: '' },
      },
      call: {
        title: '',
        body: '',
        direction: 'OUTGOING',
        duration: 0,
        timestamp: '',
        associate: { object: 'contact', objectId: '' },
      },
      dataMapping: {
        properties: {},
      },
      errorHandling: {
        retryOnError: true,
        retryCount: 3,
        retryDelay: 1000,
      },
    },
  },
  'action:delay': {
    type: 'action:delay',
    name: 'Delay',
    description: 'Pause the workflow for a specific amount of time.',
    category: 'actions',
    icon: HourglassEmptyIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => DelayPanel,
    defaultData: {
      label: 'Delay',
      delay: 1,
      unit: 'seconds',
    },
  },
  'action:code': {
    type: 'action:code',
    name: 'Code',
    description: 'Run custom JavaScript code.',
    category: 'actions',
    icon: CodeIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => CodePanel,
    defaultData: {
      label: 'Run Code',
      code: `// The return value of this script will be the output of the node.\n// You can access input data via the 'input' variable.\n\nreturn { result: 'Hello World' };`,
    },
  },
  'action:apiSequence': {
    type: 'action:apiSequence',
    name: 'API Sequence',
    description:
      'Execute a sequence of HTTP requests where the output of one can be used as input for the next.',
    category: 'actions',
    icon: HttpIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => ApiSequencePanel,
    defaultData: {
      label: 'API Sequence',
      apiCalls: [],
    },
  },
  'action:csvParse': {
    type: 'action:csvParse',
    name: 'CSV Parse',
    description: 'Parse CSV content from URL or inline/context into rows/objects',
    category: 'actions',
    icon: DescriptionIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => CsvParsePanel,
    defaultData: {
      label: 'CSV Parse',
      mode: 'context',
      text: '',
      url: '',
      delimiter: ',',
      hasHeader: true,
      trim: true,
      skipEmpty: true,
      columns: '',
      outputMode: 'objects',
      previewRows: 10,
    },
  },
  'action:openAi': {
    type: 'action:openAi',
    name: 'OpenAI Action',
    description: 'Process data using an OpenAI model with a custom prompt.',
    category: 'actions',
    icon: AutoAwesomeIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => OpenAiPanel,
    defaultData: {
      label: 'AI Action',
      prompt: 'The following is data from a previous step: {{input.data}}. Please summarize it.',
      model: 'gpt-3.5-turbo',
    },
  },
  'action:template20:procedure': {
    type: 'action:template20:procedure',
    name: 'Template20 Procedure',
    description: 'Discover and execute a high-confidence stored procedure for an entity.',
    category: 'actions',
    icon: DescriptionIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => Template20ProcedurePanel,
    defaultData: {
      label: 'Run Template20 Procedure',
      entityType: '',
      serviceName: '',
      minConfidence: 0.8,
      parameters: '',
    },
  },
  'action:email': {
    type: 'action:email',
    name: 'Send Email',
    description: 'Send an email with dynamic content from previous workflow steps.',
    category: 'actions',
    icon: EmailIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => EmailActionPanel,
    defaultData: {
      label: 'Send Email',
      to: '',
      subject: '',
      htmlBody: '',
      attachments: [],
    },
  },
  'action:graphql:execute': {
    type: 'action:graphql:execute',
    name: 'GraphQL Execute',
    description: 'Execute a GraphQL query/mutation against the local schema.',
    category: 'actions',
    icon: ArticleIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => GraphQLExecutePanel,
    defaultData: {
      label: 'GraphQL Execute',
      operationName: '',
      query: '',
      variables: '',
    },
  },
  'action:fileGeneration': {
    type: 'action:fileGeneration',
    name: 'File Generation',
    description: 'Generate CSV, XML, or JSON files from workflow data.',
    category: 'actions',
    icon: DescriptionIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => FileGenerationPanel,
    defaultData: {
      label: 'Generate File',
      format: 'csv',
      sourceData: '{{previousNodeId.data}}',
      filename: 'generated_file',
      csvConfig: {
        delimiter: ',',
        includeHeaders: true,
        headers: [],
        quoteStrings: true,
        escapeQuotes: true,
      },
      xmlConfig: {
        rootElement: 'data',
        itemElement: 'item',
        encoding: 'UTF-8',
        pretty: true,
        xmlDeclaration: true,
      },
      jsonConfig: {
        pretty: true,
        sortKeys: false,
        includeMetadata: false,
      },
    },
  },
  'action:ftpUpload': {
    type: 'action:ftpUpload',
    name: 'FTP Upload',
    description: 'Upload files to FTP, FTPS, or SFTP servers.',
    category: 'actions',
    icon: FtpIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => FtpUploadPanel,
    defaultData: {
      label: 'FTP Upload',
      protocol: 'ftp',
      host: '',
      port: '',
      username: '',
      password: '',
      remotePath: '/',
      filename: '',
      fileSource: 'previous',
      fileId: '',
      passive: true,
      secure: false,
      timeout: 30000,
    },
  },
  'action:approval': {
    type: 'action:approval',
    name: 'Approval',
    description: 'Pauses the workflow and waits for a manual approval.',
    category: 'actions',
    icon: CheckCircleOutlineIcon,
    inputs: 1,
    outputs: [
      { id: 'approve', name: 'Approve' },
      { id: 'reject', name: 'Reject' },
    ],
    getPropertiesComponent: () => ApprovalPanel,
    defaultData: {
      label: 'Manual Approval',
      instructions: 'Please review the following data and approve or reject.',
    },
  },
  'action:logger': {
    type: 'action:logger',
    name: 'Logger',
    description: 'Logs data to the workflow execution history.',
    category: 'actions',
    icon: SpeakerNotesIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => LoggerPanel,
    defaultData: {
      label: 'Log Data',
      logLevel: 'info',
      message: 'Data: {{input}}',
    },
  },
  'action:teams:notify': {
    type: 'action:teams:notify',
    name: 'Teams Notify',
    description: 'Send a message to a Microsoft Teams channel via Incoming Webhook.',
    category: 'actions',
    icon: ArticleIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => TeamsNotifyPanel,
    defaultData: {
      label: 'Teams Notify',
      webhookUrl: '',
      title: '',
      message: '',
      color: '#0078D4',
    },
  },
  'action:sqlServerAdmin': {
    type: 'action:sqlServerAdmin',
    name: 'SQL Server Admin',
    description: 'Execute admin operations (backup, restore, create db/login, mirroring, raw SQL).',
    category: 'actions',
    icon: StorageIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => SqlServerAdminPanel,
    defaultData: {
      label: 'SQL Server Admin',
      connection: {
        server: '',
        database: '',
        port: 1433,
        username: '',
        password: '',
      },
      action: '',
      options: '',
    },
  },
  'action:idempotency': {
    type: 'action:idempotency',
    name: 'Idempotency',
    description: 'Prevent duplicate processing using a Redis-backed idempotency key.',
    category: 'actions',
    icon: CodeIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => IdempotencyPanel,
    defaultData: {
      label: 'Idempotency',
      key: '',
      ttlSeconds: 86400,
    },
  },
  'action:transform': {
    type: 'action:transform',
    name: 'Transform',
    description:
      'Map fields from prior steps into a structured output; optional required fields validation.',
    category: 'actions',
    icon: CodeIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => TransformPanel,
    defaultData: {
      label: 'Transform',
      mappings: [],
      requireFields: [],
    },
  },
  'action:zoominfo:contactDiscovery': {
    type: 'action:zoominfo:contactDiscovery',
    name: 'ZoomInfo Contact Discovery',
    description: 'Search for and enrich contact data from ZoomInfo.',
    category: 'actions',
    icon: ContactPageIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => ZoomInfoContactDiscoveryPanel,
    defaultData: {
      label: 'ZoomInfo Contact Discovery',
      credentials: {
        type: 'apikey',
        apiKey: '',
        username: '',
        password: '',
        privateKey: '',
        clientId: '',
      },
      searchCriteria: {
        companyDomain: '',
        companyId: '',
        companyName: '',
        jobTitle: '',
        seniority: '',
        department: '',
        location: '',
        limit: 25,
        offset: 0,
        includeCompanyData: true,
      },
      enrichmentOptions: {
        customFields: {},
      },
      outputFormat: 'enriched',
    },
  },
  'action:salesforce:record': {
    type: 'action:salesforce:record',
    name: 'Salesforce Record Action',
    description: 'Create, update, upsert, find, or attach records in Salesforce.',
    category: 'actions',
    icon: BusinessIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => SalesforceActionPanel,
    defaultData: {
      label: 'Salesforce Record Action',
      connection: {
        accessToken: '',
        instanceUrl: '',
        apiVersion: 'v58.0',
      },
      operation: 'create',
      object: 'Lead',
      // Upsert options
      externalIdField: '',
      // Update options
      recordId: '',
      // Find / Find or Create options
      search: {
        field: '',
        value: '',
        createIfNotFound: false,
      },
      // Campaign member options
      campaign: {
        campaignId: '',
        memberIdField: 'LeadId',
        status: 'Sent',
      },
      // Attachment options
      attachment: {
        parentId: '',
        fileName: '',
        contentBase64: '',
        contentType: 'application/octet-stream',
      },
      dataMapping: {
        fields: {},
      },
      errorHandling: {
        retryOnError: true,
        retryCount: 3,
        retryDelay: 1000,
      },
    },
  },
  'action:crm:integration': {
    type: 'action:crm:integration',
    name: 'CRM Integration',
    description: 'Send data to CRM systems like Salesforce, HubSpot, Pipedrive, or Dynamics.',
    category: 'actions',
    icon: IntegrationInstructionsIcon,
    inputs: 1,
    outputs: 1,
    getPropertiesComponent: () => CRMIntegrationPanel,
    defaultData: {
      label: 'CRM Integration',
      crmType: 'custom',
      connection: {
        baseURL: '',
        accessToken: '',
        apiToken: '',
        username: '',
        password: '',
        timeout: 30000,
        customHeaders: {},
      },
      operation: 'create',
      dataMapping: {
        fields: {},
        crmDefaults: {},
        includeMetadata: true,
      },
      batchSettings: {
        enabled: false,
        batchSize: 20,
        batchDelay: 1000,
      },
      errorHandling: {
        retryOnError: true,
        retryCount: 3,
        retryDelay: 1000,
      },
    },
  },
  // Logic Nodes
  'logic:router': {
    type: 'logic:router',
    name: 'Router',
    description: 'Branch the workflow based on one or more conditions.',
    category: 'logic',
    icon: FilterAltIcon,
    inputs: 1,
    // The "Default" output is defined here.
    // Other outputs are generated dynamically from the node's rules.
    outputs: [{ id: 'fallback', name: 'Fallback' }],
    getPropertiesComponent: () => RouterPanel, // Changed from FilterPanel
    defaultData: () => ({
      label: 'Router',
      rules: [
        // Example Rule
        {
          id: `rule_${Date.now()}`,
          name: 'Success',
          logic: 'and',
          conditions: [{ variable: '{{input.statusCode}}', operator: 'equals', value: '200' }],
        },
      ],
    }),
  },
};

// Update references if any component was using the old name
// (We will also need to update any saved workflows in the DB if they have 'logic:filter')
// NODE_TYPES['logic:filter'] = NODE_TYPES['logic:router'];

export const getNodeDefinition = type => {
  // Legacy support for 'logic:filter'
  if (type === 'logic:filter') {
    return NODE_TYPES['logic:router'];
  }
  return NODE_TYPES[type];
};
