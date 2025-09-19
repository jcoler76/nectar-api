// Database type configurations
export const DATABASE_TYPES = [
  {
    value: 'MSSQL',
    label: 'Microsoft SQL Server',
    defaultPort: 1433,
    icon: '🗄️',
    description: 'Microsoft SQL Server database',
    category: 'Traditional',
  },
  {
    value: 'POSTGRESQL',
    label: 'PostgreSQL',
    defaultPort: 5432,
    icon: '🐘',
    description: 'PostgreSQL open-source relational database',
    category: 'Traditional',
  },
  {
    value: 'MYSQL',
    label: 'MySQL',
    defaultPort: 3306,
    icon: '🐬',
    description: 'MySQL/MariaDB relational database',
    category: 'Traditional',
  },
  {
    value: 'MONGODB',
    label: 'MongoDB',
    defaultPort: 27017,
    icon: '🍃',
    description: 'MongoDB NoSQL document database',
    category: 'Traditional',
  },
  {
    value: 'SQLITE',
    label: 'SQLite',
    defaultPort: null,
    icon: '💾',
    description: 'SQLite lightweight database (file-based)',
    category: 'Traditional',
  },
  {
    value: 'ORACLE',
    label: 'Oracle Database',
    defaultPort: 1521,
    icon: '🏛️',
    description: 'Oracle Database Enterprise',
    category: 'Traditional',
  },
  // AWS Cloud Databases
  {
    value: 'AWS_RDS_POSTGRESQL',
    label: 'AWS RDS PostgreSQL',
    defaultPort: 5432,
    icon: '🐘',
    description: 'Amazon RDS PostgreSQL managed database',
    category: 'AWS',
    cloudProvider: 'AWS',
  },
  {
    value: 'AWS_RDS_MYSQL',
    label: 'AWS RDS MySQL',
    defaultPort: 3306,
    icon: '🐬',
    description: 'Amazon RDS MySQL managed database',
    category: 'AWS',
    cloudProvider: 'AWS',
  },
  {
    value: 'AWS_RDS_MSSQL',
    label: 'AWS RDS SQL Server',
    defaultPort: 1433,
    icon: '🗄️',
    description: 'Amazon RDS SQL Server managed database',
    category: 'AWS',
    cloudProvider: 'AWS',
  },
  {
    value: 'AWS_RDS_ORACLE',
    label: 'AWS RDS Oracle',
    defaultPort: 1521,
    icon: '🏛️',
    description: 'Amazon RDS Oracle managed database',
    category: 'AWS',
    cloudProvider: 'AWS',
  },
  {
    value: 'AWS_AURORA_POSTGRESQL',
    label: 'AWS Aurora PostgreSQL',
    defaultPort: 5432,
    icon: '🌟',
    description: 'Amazon Aurora PostgreSQL-compatible database',
    category: 'AWS',
    cloudProvider: 'AWS',
  },
  {
    value: 'AWS_AURORA_MYSQL',
    label: 'AWS Aurora MySQL',
    defaultPort: 3306,
    icon: '🌟',
    description: 'Amazon Aurora MySQL-compatible database',
    category: 'AWS',
    cloudProvider: 'AWS',
  },
  // Azure Cloud Databases
  {
    value: 'AZURE_SQL_DATABASE',
    label: 'Azure SQL Database',
    defaultPort: 1433,
    icon: '☁️',
    description: 'Microsoft Azure SQL Database',
    category: 'Azure',
    cloudProvider: 'Azure',
  },
  {
    value: 'AZURE_SQL_MANAGED_INSTANCE',
    label: 'Azure SQL Managed Instance',
    defaultPort: 1433,
    icon: '☁️',
    description: 'Azure SQL Managed Instance',
    category: 'Azure',
    cloudProvider: 'Azure',
  },
  {
    value: 'AZURE_POSTGRESQL',
    label: 'Azure Database for PostgreSQL',
    defaultPort: 5432,
    icon: '🐘',
    description: 'Azure managed PostgreSQL service',
    category: 'Azure',
    cloudProvider: 'Azure',
  },
  {
    value: 'AZURE_MYSQL',
    label: 'Azure Database for MySQL',
    defaultPort: 3306,
    icon: '🐬',
    description: 'Azure managed MySQL service',
    category: 'Azure',
    cloudProvider: 'Azure',
  },
  // Google Cloud Databases
  {
    value: 'GCP_CLOUD_SQL_POSTGRESQL',
    label: 'Google Cloud SQL PostgreSQL',
    defaultPort: 5432,
    icon: '🐘',
    description: 'Google Cloud SQL PostgreSQL',
    category: 'Google Cloud',
    cloudProvider: 'GCP',
  },
  {
    value: 'GCP_CLOUD_SQL_MYSQL',
    label: 'Google Cloud SQL MySQL',
    defaultPort: 3306,
    icon: '🐬',
    description: 'Google Cloud SQL MySQL',
    category: 'Google Cloud',
    cloudProvider: 'GCP',
  },
  {
    value: 'GCP_CLOUD_SQL_MSSQL',
    label: 'Google Cloud SQL Server',
    defaultPort: 1433,
    icon: '🗄️',
    description: 'Google Cloud SQL Server',
    category: 'Google Cloud',
    cloudProvider: 'GCP',
  },
  {
    value: 'GCP_SPANNER',
    label: 'Google Cloud Spanner',
    defaultPort: 443,
    icon: '🔧',
    description: 'Google Cloud Spanner globally distributed database',
    category: 'Google Cloud',
    cloudProvider: 'GCP',
  },
  // Analytics & Big Data
  {
    value: 'BIGQUERY',
    label: 'Google BigQuery',
    defaultPort: 443,
    icon: '📊',
    description: 'Google BigQuery data warehouse',
    category: 'Analytics',
    cloudProvider: 'GCP',
  },
  {
    value: 'SNOWFLAKE',
    label: 'Snowflake',
    defaultPort: 443,
    icon: '❄️',
    description: 'Snowflake cloud data platform',
    category: 'Analytics',
    cloudProvider: 'Snowflake',
  },
];

// Utility functions for database types
export const getDatabaseType = value => {
  return DATABASE_TYPES.find(type => type.value === value);
};

export const getDatabaseTypesByCategory = category => {
  return DATABASE_TYPES.filter(type => type.category === category);
};

export const getCategories = () => {
  return [...new Set(DATABASE_TYPES.map(type => type.category))];
};

export const getCategoryDisplayName = category => {
  const categoryMap = {
    Traditional: '🖥️ Traditional Databases',
    AWS: '☁️ Amazon Web Services',
    Azure: '🔷 Microsoft Azure',
    'Google Cloud': '🟦 Google Cloud Platform',
    Analytics: '📊 Analytics & Big Data',
  };
  return categoryMap[category] || category;
};
