const DatabaseService = require('../../services/databaseService');
const { hasPermission } = require('../middleware/apiKeyAuth');

const productionJobJacketResolvers = {
  Query: {
    async productionJobJackets(parent, args, context) {
      // Support both JWT and API key authentication
      const { user, jwtUser, apiKeyUser } = context;

      if (!user) {
        throw new Error('Authentication required');
      }

      // Block client API keys from accessing production job jackets unless they have specific permissions
      if (apiKeyUser && apiKeyUser.type === 'client') {
        // For client API key auth, check if they have permission for this specific service/view
        const serviceName = 'modernluxury'; // The service that contains this view
        const procedureName = 'vwCustomReport_ProductionJobJacket_v2'; // The view/procedure name

        if (!hasPermission(apiKeyUser, serviceName, procedureName, 'GET')) {
          throw new Error(
            'Client API key does not have permission to access production job jackets'
          );
        }
      }

      // Developer API keys are allowed broader access
      if (apiKeyUser && apiKeyUser.type === 'developer') {
        // Developer endpoints can access if they specify the right service
        const serviceName = 'modernluxury';
        const procedureName = 'vwCustomReport_ProductionJobJacket_v2';

        if (!hasPermission(apiKeyUser, serviceName, procedureName, 'GET')) {
          throw new Error('Insufficient permissions for this service');
        }
      }

      const { filter = {}, sort, limit = 100, offset = 0 } = args;

      // Build WHERE clause from filter
      let whereClause = '';
      const params = {};

      if (filter.contractId) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Contract ID] = @contractId';
        params.contractId = filter.contractId;
      }

      if (filter.customerId) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Customer ID] = @customerId';
        params.customerId = filter.customerId;
      }

      if (filter.year) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'IssueYear = @year';
        params.year = filter.year;
      }

      if (filter.issueId) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'IssueID = @issueId';
        params.issueId = filter.issueId;
      }

      if (filter.zoneId) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'ZoneID = @zoneId';
        params.zoneId = filter.zoneId;
      }

      if (filter.currentStageId) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Current Stage ID] = @currentStageId';
        params.currentStageId = filter.currentStageId;
      }

      if (filter.contractRepId) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Contract Rep ID] = @contractRepId';
        params.contractRepId = filter.contractRepId;
      }

      if (filter.customerRepId) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Customer Rep ID] = @customerRepId';
        params.customerRepId = filter.customerRepId;
      }

      if (filter.adArrived !== undefined) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Ad Arrived?] = @adArrived';
        params.adArrived = filter.adArrived ? 1 : 0;
      }

      if (filter.requiresDesign !== undefined) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Requires Design] = @requiresDesign';
        params.requiresDesign = filter.requiresDesign ? 1 : 0;
      }

      if (filter.contractStatus) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Contract Status] = @contractStatus';
        params.contractStatus = filter.contractStatus;
      }

      if (filter.companyName) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Company Name] LIKE @companyName';
        params.companyName = `%${filter.companyName}%`;
      }

      if (filter.adSize) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Ad Size] LIKE @adSize';
        params.adSize = `%${filter.adSize}%`;
      }

      // **DATE RANGE FILTERS - This is what you asked about!**
      if (filter.issueDateFrom) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Issue Date] >= @issueDateFrom';
        params.issueDateFrom = filter.issueDateFrom;
      }

      if (filter.issueDateTo) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Issue Date] <= @issueDateTo';
        params.issueDateTo = filter.issueDateTo;
      }

      if (filter.contractAddedDateFrom) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Contract Added Date] >= @contractAddedDateFrom';
        params.contractAddedDateFrom = filter.contractAddedDateFrom;
      }

      if (filter.contractAddedDateTo) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Contract Added Date] <= @contractAddedDateTo';
        params.contractAddedDateTo = filter.contractAddedDateTo;
      }

      if (filter.dateAdArrivedFrom) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Date Ad Arrived] >= @dateAdArrivedFrom';
        params.dateAdArrivedFrom = filter.dateAdArrivedFrom;
      }

      if (filter.dateAdArrivedTo) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Date Ad Arrived] <= @dateAdArrivedTo';
        params.dateAdArrivedTo = filter.dateAdArrivedTo;
      }

      if (filter.dateAdDoneFrom) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Date Ad Done] >= @dateAdDoneFrom';
        params.dateAdDoneFrom = filter.dateAdDoneFrom;
      }

      if (filter.dateAdDoneTo) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Date Ad Done] <= @dateAdDoneTo';
        params.dateAdDoneTo = filter.dateAdDoneTo;
      }

      if (filter.dateDueFrom) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Date Due] >= @dateDueFrom';
        params.dateDueFrom = filter.dateDueFrom;
      }

      if (filter.dateDueTo) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Date Due] <= @dateDueTo';
        params.dateDueTo = filter.dateDueTo;
      }

      // **NUMERIC RANGE FILTERS**
      if (filter.netAmountMin !== undefined) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'Net >= @netAmountMin';
        params.netAmountMin = filter.netAmountMin;
      }

      if (filter.netAmountMax !== undefined) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'Net <= @netAmountMax';
        params.netAmountMax = filter.netAmountMax;
      }

      if (filter.grossAmountMin !== undefined) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'Gross >= @grossAmountMin';
        params.grossAmountMin = filter.grossAmountMin;
      }

      if (filter.grossAmountMax !== undefined) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'Gross <= @grossAmountMax';
        params.grossAmountMax = filter.grossAmountMax;
      }

      // **TEXT SEARCH FILTERS**
      if (filter.customerEmailContains) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Customer Email] LIKE @customerEmailContains';
        params.customerEmailContains = `%${filter.customerEmailContains}%`;
      }

      if (filter.adNotesContains) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Ad Notes] LIKE @adNotesContains';
        params.adNotesContains = `%${filter.adNotesContains}%`;
      }

      if (filter.productionNotesContains) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += '[Production Notes] LIKE @productionNotesContains';
        params.productionNotesContains = `%${filter.productionNotesContains}%`;
      }

      // **MULTIPLE VALUE FILTERS (IN clauses)**
      if (filter.contractStatusIn && filter.contractStatusIn.length > 0) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        const statusPlaceholders = filter.contractStatusIn
          .map((_, index) => `@contractStatus${index}`)
          .join(', ');
        whereClause += `[Contract Status] IN (${statusPlaceholders})`;
        filter.contractStatusIn.forEach((status, index) => {
          params[`contractStatus${index}`] = status;
        });
      }

      if (filter.currentStageIn && filter.currentStageIn.length > 0) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        const stagePlaceholders = filter.currentStageIn
          .map((_, index) => `@currentStage${index}`)
          .join(', ');
        whereClause += `[Current Stage] IN (${stagePlaceholders})`;
        filter.currentStageIn.forEach((stage, index) => {
          params[`currentStage${index}`] = stage;
        });
      }

      if (filter.adSizeIn && filter.adSizeIn.length > 0) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        const sizePlaceholders = filter.adSizeIn.map((_, index) => `@adSize${index}`).join(', ');
        whereClause += `[Ad Size] IN (${sizePlaceholders})`;
        filter.adSizeIn.forEach((size, index) => {
          params[`adSize${index}`] = size;
        });
      }

      // **BOOLEAN COMBINATION FILTERS**
      if (filter.hasOpenBalance !== undefined) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        if (filter.hasOpenBalance) {
          whereClause += '[Total Open Balance] > 0';
        } else {
          whereClause += '([Total Open Balance] = 0 OR [Total Open Balance] IS NULL)';
        }
      }

      if (filter.hasProductionNotes !== undefined) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        if (filter.hasProductionNotes) {
          whereClause += "[Production Notes] IS NOT NULL AND [Production Notes] != ''";
        } else {
          whereClause += "([Production Notes] IS NULL OR [Production Notes] = '')";
        }
      }

      // Build ORDER BY clause
      let orderClause = '';
      if (sort) {
        const direction = sort.direction === 'DESC' ? 'DESC' : 'ASC';
        // Map GraphQL field names to view column names
        const fieldMapping = {
          companyName: '[Company Name]',
          customerLastName: '[Customer Last Name]',
          customerFirstName: '[Customer First Name]',
          contractId: '[Contract ID]',
          issueDate: '[Issue Date]',
          contractAddedDate: '[Contract Added Date]',
          currentStage: '[Current Stage]',
          net: 'Net',
          gross: 'Gross',
          dateAdArrived: '[Date Ad Arrived]',
          dateAdDone: '[Date Ad Done]',
        };

        const sqlField = fieldMapping[sort.field] || `[${sort.field}]`;
        orderClause = `ORDER BY ${sqlField} ${direction}`;
      } else {
        orderClause = 'ORDER BY [Company Name], [Customer Last Name], [Customer First Name]';
      }

      // **OPTION 1: Query the view directly with all parameters**
      const query = `
        SELECT TOP (@limit) *
        FROM (
          SELECT ROW_NUMBER() OVER (${orderClause.replace('ORDER BY ', '')}) as RowNum, *
          FROM [dbo].[vwCustomReport_ProductionJobJacket_v2]
          ${whereClause}
        ) AS PagedResults
        WHERE RowNum > @offset
        ${orderClause}
      `;

      // Add pagination parameters
      params.limit = limit;
      params.offset = offset;

      try {
        // Execute the query using your existing database service
        // If API key auth, use the service from the application's role
        const service = apiKeyUser
          ? apiKeyUser.application.defaultRole.permissions[0]?.serviceId
          : null;

        const result = await DatabaseService.executeQuery(query, params, service);

        return result.map(row => ({
          contractId: row['Contract ID'],
          contractIdWithLink: row['Contract ID w/Link'],
          jobJacket: row['Job Jacket'],
          issue: row['Issue'],
          issueId: row['IssueID'],
          issueDate: row['Issue Date'],
          issueStartDate: row['Issue Start Date'],
          issueOrder: row['Issue Order'],
          issueMonth: row['Issue Month'],
          issueMonthName: row['Issue Month Name'],
          issueYear: row['IssueYear'],
          zone: row['Zone'],
          zoneId: row['ZoneID'],
          net: row['Net'],
          gross: row['Gross'],
          barter: row['Barter'],

          // Ad Information
          adSize: row['Ad Size'],
          adSizeActual: row['Ad Size Actual'],
          adName: row['Ad Name'],
          adColumns: row['Ad Columns'],
          adInches: row['Ad Inches'],
          adSection: row['Ad Section'],
          adPosition: row['Ad Position'],
          adColor: row['Ad Color'],
          adFrequency: row['Ad Frequency'],
          adNotes: row['Ad Notes'],
          adNumber: row['Ad Number'],
          isBleed: row['isBleed?'],

          // Production Information
          dateAdArrived: row['Date Ad Arrived'],
          requiresDesign: row['Requires Design'],
          adArrived: row['Ad Arrived?'],
          date1stProof: row['Date 1st Proof'],
          date1stChanges: row['Date 1st Changes'],
          date2ndProof: row['Date 2nd Proof'],
          date2ndChanges: row['Date 2nd Changes'],
          date3rdProof: row['Date 3rd Proof'],
          dateAdDone: row['Date Ad Done'],
          currentStage: row['Current Stage'],
          currentStageId: row['Current Stage ID'],
          contractStatus: row['Contract Status'],

          // Customer Information
          customerId: row['Customer ID'],
          companyName: row['Company Name'],
          companyNameWithContact: row['Company Name w/Contact'],
          customerFirstName: row['Customer First Name'],
          customerLastName: row['Customer Last Name'],
          customerEmail: row['Customer Email'],
          customerPhone: row['Customer Phone'],
          customerRepName: row['Customer Rep Name'],

          // Financial Information
          contractCommissionPercent: row['Contract Commission %'],
          contractCommissionNet: row['Contract Commission (Net)'],
          contractCommissionCash: row['Contract Commission (Cash)'],
          productionCharge: row['Production Charge'],
          cardRate: row['Card Rate'],
          discount: row['Discount'],
          adjustments: row['Adjustments'],
          adjustmentsString: row['Adjustments String'],
          contractPageRate: row['Contract Page Rate'],

          // Sales Data
          salesJanuary: row['Sales-January'],
          salesFebruary: row['Sales-February'],
          salesMarch: row['Sales-March'],
          salesApril: row['Sales-April'],
          salesMay: row['Sales-May'],
          salesJune: row['Sales-June'],
          salesJuly: row['Sales-July'],
          salesAugust: row['Sales-August'],
          salesSeptember: row['Sales-September'],
          salesOctober: row['Sales-October'],
          salesNovember: row['Sales-November'],
          salesDecember: row['Sales-December'],
          salesTotal: row['Sales-Total'],
          salesTotalCurrentYear: row['Sales-Total CY'],
          salesTotalPreviousYear: row['Sales-Total PY'],

          // Invoice & Payment Information
          paymentDate: row['Payment Date'],
          paymentAmount: row['Payment Amount'],
          paymentMemo: row['Payment Memo'],
          paymentMethod: row['Payment Method'],
          invoiceId: row['Invoice ID'],
          invoiceNumber: row['Invoice Number'],
          invoiceTotal: row['Invoice Total'],
          totalOpenBalance: row['Total Open Balance'],
          invoiceDate: row['Invoice Date'],
          invoiced: row['Invoiced?'] === 'Yes',
        }));
      } catch (error) {
        console.error('Error fetching production job jackets:', error);
        throw new Error('Failed to fetch production job jackets');
      }
    },

    async productionJobJacket(parent, args, context) {
      // Support both JWT and API key authentication
      const { user, jwtUser, apiKeyUser } = context;

      if (!user) {
        throw new Error('Authentication required');
      }

      // If using API key authentication, check permissions
      if (apiKeyUser) {
        const serviceName = 'modernluxury';
        const procedureName = 'vwCustomReport_ProductionJobJacket_v2';

        if (!hasPermission(apiKeyUser, serviceName, procedureName, 'GET')) {
          throw new Error('Insufficient permissions for this service');
        }
      }

      const { contractId } = args;

      // **OPTION 1: Query the view directly**
      const query = `
        SELECT *
        FROM [dbo].[vwCustomReport_ProductionJobJacket_v2]
        WHERE [Contract ID] = @contractId
      `;

      try {
        const service = apiKeyUser
          ? apiKeyUser.application.defaultRole.permissions[0]?.serviceId
          : null;
        const result = await DatabaseService.executeQuery(query, { contractId }, service);

        if (result.length === 0) {
          return null;
        }

        const row = result[0];

        return {
          contractId: row['Contract ID'],
          contractIdWithLink: row['Contract ID w/Link'],
          jobJacket: row['Job Jacket'],
          issue: row['Issue'],
          issueId: row['IssueID'],
          issueDate: row['Issue Date'],
          companyName: row['Company Name'],
          customerFirstName: row['Customer First Name'],
          customerLastName: row['Customer Last Name'],
          customerEmail: row['Customer Email'],
          currentStage: row['Current Stage'],
          contractStatus: row['Contract Status'],
          net: row['Net'],
          gross: row['Gross'],
          adSize: row['Ad Size'],
          adSection: row['Ad Section'],
          // Map all other fields as needed...
        };
      } catch (error) {
        console.error('Error fetching production job jacket:', error);
        throw new Error('Failed to fetch production job jacket');
      }
    },
  },
};

module.exports = productionJobJacketResolvers;
