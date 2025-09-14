import dbManager from '../../../utils/databaseConnectionManager.js';
import { logger } from '../../../utils/logger.js';
import { validateSqlIdentifier, executeSafeSql } from '../../../middleware/sqlSecurity.js';
import { interpolateSql } from '../interpolationSecure.js';

export type SqlAdminAction =
  | 'backupDatabase'
  | 'restoreDatabaseWithMove'
  | 'createDatabase'
  | 'dropDatabase'
  | 'createLogin'
  | 'mapUserToLogin'
  | 'setRecoveryModel'
  | 'executeSql'
  | 'setMirrorPartner'
  | 'configureMirroringPrereqs';

export interface SqlServerAdminConfig {
  label?: string;
  // Connection comes from a Service/Connection mapping on the calling step.
  // We keep it generic to reuse dbManager.
  connection: {
    server: string;
    database: string;
    username?: string;
    password?: string;
    encryptedPassword?: string;
    port?: number;
    trustedConnection?: boolean;
  };
  action: SqlAdminAction;
  options?: Record<string, any>;
}

// DEPRECATED: Use validateSqlIdentifier from sqlSecurity middleware instead
const sqlSafeIdent = (name: string) => {
  logger.warn('Using deprecated sqlSafeIdent - migrate to validateSqlIdentifier');
  return validateSqlIdentifier(name);
};

export const execute = async (config: SqlServerAdminConfig, _context: any) => {
  const { label, connection, action, options = {} } = config;
  logger.info('SQL Server Admin node invoked', { label, action });

  try {
    switch (action) {
      case 'backupDatabase': {
        const { backupPath, withFormat = false } = options;
        if (!backupPath) throw new Error('backupPath is required');
        const db = sqlSafeIdent(connection.database);
        const sql = `BACKUP DATABASE [${db}] TO DISK = @backupPath WITH INIT${withFormat ? ', FORMAT' : ''}`;
        const result = await dbManager.executeQuery(connection, sql, { backupPath });
        return { success: true, info: 'Backup started', rowsAffected: result.rowsAffected };
      }

      case 'restoreDatabaseWithMove': {
        const {
          sourceBackupPath,
          newDatabaseName,
          dataLogicalName,
          logLogicalName,
          dataFilePath,
          logFilePath,
          replace = false,
        } = options;
        if (
          !sourceBackupPath ||
          !newDatabaseName ||
          !dataLogicalName ||
          !logLogicalName ||
          !dataFilePath ||
          !logFilePath
        ) {
          throw new Error('Missing one or more required restore options');
        }
        const newDb = sqlSafeIdent(newDatabaseName);
        const replaceClause = replace ? 'REPLACE' : '';
        const sql = `RESTORE DATABASE [${newDb}] FROM DISK = @sourceBackupPath WITH MOVE @dataLogicalName TO @dataFilePath, MOVE @logLogicalName TO @logFilePath, ${replaceClause}`;
        const result = await dbManager.executeQuery(connection, sql, {
          sourceBackupPath,
          dataLogicalName,
          logLogicalName,
          dataFilePath,
          logFilePath,
        });
        return { success: true, info: 'Restore started', rowsAffected: result.rowsAffected };
      }

      case 'createDatabase': {
        const { newDatabaseName } = options;
        if (!newDatabaseName) throw new Error('newDatabaseName is required');
        const db = sqlSafeIdent(newDatabaseName);
        const sql = `CREATE DATABASE [${db}]`;
        const result = await dbManager.executeQuery(connection, sql);
        return { success: true, info: 'Database created', rowsAffected: result.rowsAffected };
      }

      case 'dropDatabase': {
        const { databaseName } = options;
        if (!databaseName) throw new Error('databaseName is required');
        const db = sqlSafeIdent(databaseName);
        const sql = `ALTER DATABASE [${db}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${db}];`;
        const result = await dbManager.executeQuery(connection, sql);
        return { success: true, info: 'Database dropped', rowsAffected: result.rowsAffected };
      }

      case 'createLogin': {
        const { loginName, password } = options;
        if (!loginName || !password) throw new Error('loginName and password are required');
        const login = sqlSafeIdent(loginName);
        const sql = `IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = @login) BEGIN CREATE LOGIN [${login}] WITH PASSWORD = @password, CHECK_POLICY = OFF; END`;
        const result = await dbManager.executeQuery(connection, sql, { login, password });
        return { success: true, info: 'Login ensured', rowsAffected: result.rowsAffected };
      }

      case 'mapUserToLogin': {
        const { databaseName, userName, loginName, defaultSchema = 'dbo' } = options;
        if (!databaseName || !userName || !loginName)
          throw new Error('databaseName, userName, and loginName are required');
        const db = sqlSafeIdent(databaseName);
        const user = sqlSafeIdent(userName);
        const login = sqlSafeIdent(loginName);
        const useDb = `USE [${db}]`;
        const sql = `${useDb}; IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @user) BEGIN CREATE USER [${user}] FOR LOGIN [${login}] WITH DEFAULT_SCHEMA = [${defaultSchema}]; END; EXEC sp_addrolemember N'db_owner', @user;`;
        const result = await dbManager.executeQuery(connection, sql, { user });
        return {
          success: true,
          info: 'User mapped to login and added to db_owner',
          rowsAffected: result.rowsAffected,
        };
      }

      case 'setRecoveryModel': {
        const { databaseName, model } = options; // SIMPLE | FULL | BULK_LOGGED
        if (!databaseName || !model) throw new Error('databaseName and model are required');
        const db = sqlSafeIdent(databaseName);
        const safeModel = ['SIMPLE', 'FULL', 'BULK_LOGGED'].includes(String(model).toUpperCase())
          ? String(model).toUpperCase()
          : null;
        if (!safeModel) throw new Error('Invalid recovery model');
        const sql = `ALTER DATABASE [${db}] SET RECOVERY ${safeModel}`;
        const result = await dbManager.executeQuery(connection, sql);
        return { success: true, info: 'Recovery model set', rowsAffected: result.rowsAffected };
      }

      case 'executeSql': {
        const { sql, parameters = {} } = options;
        if (!sql || typeof sql !== 'string') throw new Error('sql is required');

        // SECURITY: Use secure SQL execution with validation
        logger.warn(
          'ExecuteSql action used - this should be migrated to specific action types for better security'
        );

        // Check if this contains template interpolation that needs parameterization
        if (sql.includes('{{')) {
          // Use secure SQL interpolation to create parameterized query
          const { sql: parameterizedSql, parameters: interpolatedParams } = interpolateSql(
            sql,
            _context
          );
          const combinedParams = { ...interpolatedParams, ...parameters };

          const result = await executeSafeSql(
            dbManager,
            connection,
            parameterizedSql,
            combinedParams,
            {
              isAdminQuery: true,
              timeout: 60000, // 1 minute for admin operations
            }
          );

          return {
            success: true,
            info: 'SQL executed securely with parameterization',
            rowsAffected: result.rowsAffected,
            data: result.recordset,
          };
        } else {
          // Use secure execution for non-interpolated SQL
          const result = await executeSafeSql(dbManager, connection, sql, parameters, {
            isAdminQuery: true,
            timeout: 60000,
          });

          return {
            success: true,
            info: 'SQL executed securely',
            rowsAffected: result.rowsAffected,
            data: result.recordset,
          };
        }
      }

      case 'configureMirroringPrereqs': {
        // Placeholder to run any required ALTER DB statements pre-mirroring
        const { databaseName } = options;
        if (!databaseName) throw new Error('databaseName is required');
        const db = sqlSafeIdent(databaseName);
        const sql = `ALTER DATABASE [${db}] SET PARTNER OFF;`;
        const result = await dbManager.executeQuery(connection, sql);
        return {
          success: true,
          info: 'Pre-mirroring cleanup executed',
          rowsAffected: result.rowsAffected,
        };
      }

      case 'setMirrorPartner': {
        const { databaseName, partnerEndpoint } = options;
        if (!databaseName || !partnerEndpoint)
          throw new Error('databaseName and partnerEndpoint are required');
        const db = sqlSafeIdent(databaseName);
        // Note: Assumes endpoints configured; full mirroring setup often requires running on both servers
        const sql = `ALTER DATABASE [${db}] SET PARTNER = @partner`;
        const result = await dbManager.executeQuery(connection, sql, { partner: partnerEndpoint });
        return { success: true, info: 'Mirror partner set', rowsAffected: result.rowsAffected };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    logger.error('SQL Server Admin node failed', { error: error.message });
    return { success: false, error: error.message || 'Unknown error' };
  }
};

export default { execute };
