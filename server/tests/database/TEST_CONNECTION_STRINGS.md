# Database Connection Test Strings

This document provides test connection strings for various database providers that can be used for testing database connectivity.

## Traditional Databases

### Microsoft SQL Server
```javascript
// Local SQL Server Express
{
  type: 'MSSQL',
  host: 'localhost',
  port: 1433,
  database: 'master',
  username: 'sa',
  password: 'YourStrong!Passw0rd',
  sslEnabled: false,
  trustServerCertificate: true
}

// SQL Server with Windows Authentication
{
  type: 'MSSQL',
  host: 'localhost',
  port: 1433,
  database: 'master',
  trustedConnection: true,
  sslEnabled: false,
  trustServerCertificate: true
}
```

### PostgreSQL
```javascript
// Local PostgreSQL
{
  type: 'POSTGRESQL',
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'password',
  sslEnabled: false
}

// ElephantSQL (Free PostgreSQL hosting)
{
  type: 'POSTGRESQL',
  host: 'raja.db.elephantsql.com',
  port: 5432,
  database: 'xxxxxxxx',
  username: 'xxxxxxxx',
  password: 'xxxxxxxx',
  sslEnabled: true
}
```

### MySQL
```javascript
// Local MySQL
{
  type: 'MYSQL',
  host: 'localhost',
  port: 3306,
  database: 'mysql',
  username: 'root',
  password: 'password',
  sslEnabled: false
}

// PlanetScale (Free MySQL hosting)
{
  type: 'MYSQL',
  host: 'aws.connect.psdb.cloud',
  port: 3306,
  database: 'database-name',
  username: 'xxxxxxxx',
  password: 'pscale_pw_xxxxxxxx',
  sslEnabled: true
}
```

### MongoDB
```javascript
// Local MongoDB
{
  type: 'MONGODB',
  host: 'localhost',
  port: 27017,
  database: 'test',
  username: '',
  password: '',
  sslEnabled: false
}

// MongoDB Atlas (Free tier)
{
  type: 'MONGODB',
  host: 'cluster0.xxxxx.mongodb.net',
  port: 27017,
  database: 'test',
  username: 'username',
  password: 'password',
  sslEnabled: true
}
```

### SQLite
```javascript
// SQLite file database
{
  type: 'SQLITE',
  database: './test.db' // File path
}
```

### Oracle Database
```javascript
// Local Oracle XE
{
  type: 'ORACLE',
  host: 'localhost',
  port: 1521,
  database: 'XE',
  username: 'hr',
  password: 'password',
  sslEnabled: false
}

// Oracle Cloud Free Tier
{
  type: 'ORACLE',
  host: 'adb.us-ashburn-1.oraclecloud.com',
  port: 1522,
  database: 'service_name',
  username: 'admin',
  password: 'password',
  sslEnabled: true
}
```

## AWS Cloud Databases

### AWS RDS PostgreSQL
```javascript
{
  type: 'AWS_RDS_POSTGRESQL',
  host: 'mydb.cluster-xxxxx.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'password',
  region: 'us-east-1',
  endpoint: 'mydb.cluster-xxxxx.us-east-1.rds.amazonaws.com',
  sslEnabled: true
}
```

### AWS RDS MySQL
```javascript
{
  type: 'AWS_RDS_MYSQL',
  host: 'mydb.xxxxx.us-east-1.rds.amazonaws.com',
  port: 3306,
  database: 'mysql',
  username: 'admin',
  password: 'password',
  region: 'us-east-1',
  endpoint: 'mydb.xxxxx.us-east-1.rds.amazonaws.com',
  sslEnabled: true
}
```

### AWS Aurora PostgreSQL
```javascript
{
  type: 'AWS_AURORA_POSTGRESQL',
  host: 'aurora-cluster.cluster-xxxxx.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'password',
  region: 'us-east-1',
  endpoint: 'aurora-cluster.cluster-xxxxx.us-east-1.rds.amazonaws.com',
  sslEnabled: true
}
```

## Azure Cloud Databases

### Azure SQL Database
```javascript
{
  type: 'AZURE_SQL_DATABASE',
  host: 'myserver.database.windows.net',
  port: 1433,
  database: 'mydatabase',
  username: 'sqladmin',
  password: 'password',
  endpoint: 'myserver.database.windows.net',
  sslEnabled: true
}
```

### Azure Database for PostgreSQL
```javascript
{
  type: 'AZURE_POSTGRESQL',
  host: 'myserver.postgres.database.azure.com',
  port: 5432,
  database: 'postgres',
  username: 'sqladmin@myserver',
  password: 'password',
  endpoint: 'myserver.postgres.database.azure.com',
  sslEnabled: true
}
```

## Google Cloud Databases

### Google Cloud SQL PostgreSQL
```javascript
{
  type: 'GCP_CLOUD_SQL_POSTGRESQL',
  host: '34.123.45.67', // Public IP
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'password',
  projectId: 'my-gcp-project',
  region: 'us-central1',
  instanceConnectionName: 'my-gcp-project:us-central1:my-instance',
  sslEnabled: true
}
```

### Google Cloud SQL MySQL
```javascript
{
  type: 'GCP_CLOUD_SQL_MYSQL',
  host: '34.123.45.67', // Public IP
  port: 3306,
  database: 'mysql',
  username: 'root',
  password: 'password',
  projectId: 'my-gcp-project',
  region: 'us-central1',
  instanceConnectionName: 'my-gcp-project:us-central1:my-instance',
  sslEnabled: true
}
```

## Analytics Databases

### Google BigQuery
```javascript
{
  type: 'BIGQUERY',
  projectId: 'my-gcp-project',
  keyFile: '/path/to/service-account-key.json', // Or set GOOGLE_APPLICATION_CREDENTIALS
  database: 'dataset_name',
  port: 443,
  sslEnabled: true
}
```

### Snowflake
```javascript
// Username/Password Authentication
{
  type: 'SNOWFLAKE',
  host: 'xy12345.us-east-1.snowflakecomputing.com',
  port: 443,
  database: 'SNOWFLAKE_SAMPLE_DATA',
  username: 'username',
  password: 'password',
  accountId: 'xy12345.us-east-1',
  warehouseName: 'COMPUTE_WH',
  authMethod: 'password',
  sslEnabled: true
}

// Key Pair Authentication
{
  type: 'SNOWFLAKE',
  host: 'xy12345.us-east-1.snowflakecomputing.com',
  port: 443,
  database: 'SNOWFLAKE_SAMPLE_DATA',
  username: 'username',
  accountId: 'xy12345.us-east-1',
  warehouseName: 'COMPUTE_WH',
  authMethod: 'keypair',
  privateKey: '-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----',
  passphrase: 'optional_passphrase',
  sslEnabled: true
}
```

## Free Testing Services

### Free Database Hosting Services for Testing

1. **PostgreSQL**:
   - ElephantSQL (Free 20MB): https://www.elephantsql.com/
   - Supabase (Free 500MB): https://supabase.com/
   - Railway (Free tier): https://railway.app/

2. **MySQL**:
   - PlanetScale (Free 10GB): https://planetscale.com/
   - Railway (Free tier): https://railway.app/

3. **MongoDB**:
   - MongoDB Atlas (Free 512MB): https://www.mongodb.com/atlas
   - Railway (Free tier): https://railway.app/

4. **Redis**:
   - Redis Cloud (Free 30MB): https://redis.com/cloud/
   - Railway (Free tier): https://railway.app/

5. **SQL Server**:
   - Azure SQL Database (Free tier): https://azure.microsoft.com/en-us/pricing/details/azure-sql-database/
   - SQL Server Express (Local): https://www.microsoft.com/en-us/sql-server/sql-server-downloads

## Environment Variables for Testing

Create a `.env.test` file with your test database credentials:

```bash
# Traditional Databases
TEST_MSSQL_HOST=localhost
TEST_MSSQL_PORT=1433
TEST_MSSQL_DATABASE=master
TEST_MSSQL_USERNAME=sa
TEST_MSSQL_PASSWORD=YourStrong!Passw0rd

TEST_POSTGRESQL_HOST=localhost
TEST_POSTGRESQL_PORT=5432
TEST_POSTGRESQL_DATABASE=postgres
TEST_POSTGRESQL_USERNAME=postgres
TEST_POSTGRESQL_PASSWORD=password

TEST_MYSQL_HOST=localhost
TEST_MYSQL_PORT=3306
TEST_MYSQL_DATABASE=mysql
TEST_MYSQL_USERNAME=root
TEST_MYSQL_PASSWORD=password

TEST_MONGODB_HOST=localhost
TEST_MONGODB_PORT=27017
TEST_MONGODB_DATABASE=test

# Cloud Databases
TEST_AWS_RDS_ENDPOINT=mydb.xxxxx.us-east-1.rds.amazonaws.com
TEST_AWS_RDS_USERNAME=admin
TEST_AWS_RDS_PASSWORD=password
TEST_AWS_REGION=us-east-1

TEST_AZURE_SQL_SERVER=myserver.database.windows.net
TEST_AZURE_SQL_USERNAME=sqladmin
TEST_AZURE_SQL_PASSWORD=password

TEST_GCP_PROJECT_ID=my-gcp-project
TEST_GCP_INSTANCE_CONNECTION_NAME=my-gcp-project:us-central1:my-instance

TEST_SNOWFLAKE_ACCOUNT=xy12345.us-east-1
TEST_SNOWFLAKE_USERNAME=username
TEST_SNOWFLAKE_PASSWORD=password
TEST_SNOWFLAKE_WAREHOUSE=COMPUTE_WH
```

## Notes

- Always use test databases for automated tests, never production databases
- Many cloud providers offer free tiers suitable for testing
- Some tests may require specific environment setup (Docker containers, local installations)
- Consider using Docker Compose for local database testing environments
- Always clean up test data after tests complete