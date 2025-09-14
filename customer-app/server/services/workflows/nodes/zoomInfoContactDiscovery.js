const ZoomInfoService = require('../../zoominfo/ZoomInfoService');
const { logger } = require('../../../utils/logger');

/**
 * ZoomInfo Contact Discovery Action Node
 * Searches for and enriches contact data from ZoomInfo
 */
module.exports = async (nodeData, workflowData, context) => {
  logger.info(`Executing ZoomInfo Contact Discovery: ${nodeData.label}`);

  try {
    const {
      credentials,
      searchCriteria = {},
      enrichmentOptions = {},
      outputFormat = 'enriched', // 'basic', 'enriched', 'full'
    } = nodeData;

    if (!credentials) {
      throw new Error('ZoomInfo credentials are required');
    }

    const zoomInfoService = new ZoomInfoService();

    // Decrypt credentials
    const decryptedCredentials = zoomInfoService.decryptCredentials(credentials);

    // Authenticate
    const token = await zoomInfoService.authenticate(decryptedCredentials);

    let contacts = [];
    let companies = [];

    // Step 1: Search for contacts based on criteria
    if (searchCriteria.companyDomain || searchCriteria.companyId || searchCriteria.companyName) {
      logger.info('Searching for contacts by company criteria');

      const contactSearchParams = {
        companyDomain: searchCriteria.companyDomain,
        companyId: searchCriteria.companyId,
        jobTitle: searchCriteria.jobTitle,
        seniority: searchCriteria.seniority,
        department: searchCriteria.department,
        location: searchCriteria.location,
        limit: searchCriteria.limit || 25,
        offset: searchCriteria.offset || 0,
      };

      contacts = await zoomInfoService.searchContacts(token, contactSearchParams);
    }

    // Step 2: Get company profiles if needed
    if (searchCriteria.includeCompanyData && contacts.length > 0) {
      logger.info('Enriching company data for discovered contacts');

      const companyIds = [...new Set(contacts.map(c => c.company_id).filter(Boolean))];
      const companyPromises = companyIds.map(companyId =>
        zoomInfoService.getCompanyProfile(token, { companyId })
      );

      const companyResults = await Promise.allSettled(companyPromises);
      companies = companyResults
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);
    }

    // Step 3: Enrich contacts if requested
    if (outputFormat === 'enriched' || outputFormat === 'full') {
      logger.info(`Enriching ${contacts.length} contacts`);

      // ZoomInfo allows up to 25 contacts per enrichment request
      const enrichmentBatches = [];
      for (let i = 0; i < contacts.length; i += 25) {
        const batch = contacts.slice(i, i + 25);
        enrichmentBatches.push(batch);
      }

      const enrichedContacts = [];
      for (const batch of enrichmentBatches) {
        try {
          const enrichedBatch = await zoomInfoService.enrichContacts(
            token,
            batch.map(c => ({ id: c.id, email: c.email }))
          );
          enrichedContacts.push(...enrichedBatch);
        } catch (error) {
          logger.warn(`Failed to enrich batch of ${batch.length} contacts:`, error.message);
          // Include original contact data if enrichment fails
          enrichedContacts.push(...batch);
        }
      }

      contacts = enrichedContacts;
    }

    // Step 4: Format output based on requirements
    let formattedData = {
      contacts,
      companies,
      summary: {
        contactsFound: contacts.length,
        companiesFound: companies.length,
        searchCriteria,
        timestamp: new Date().toISOString(),
      },
    };

    // Apply output formatting
    if (outputFormat === 'basic') {
      formattedData.contacts = contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        title: contact.job_title,
        company: contact.company_name,
        phone: contact.phone,
      }));
    } else if (outputFormat === 'full') {
      // Include technology stack and news for companies
      if (companies.length > 0) {
        logger.info('Gathering additional company intelligence');

        for (const company of companies) {
          try {
            // Get technology stack
            const techStack = await zoomInfoService.getTechnologyStack(token, company.id);
            if (techStack) {
              company.technology_stack = techStack;
            }

            // Get recent news
            const news = await zoomInfoService.getCompanyNews(token, company.id);
            if (news && news.length > 0) {
              company.recent_news = news.slice(0, 5); // Last 5 news items
            }
          } catch (error) {
            logger.warn(`Failed to get additional data for company ${company.id}:`, error.message);
          }
        }
      }
    }

    // Step 5: Apply any data transformations
    if (enrichmentOptions.customFields) {
      formattedData.contacts = formattedData.contacts.map(contact => {
        const transformedContact = { ...contact };

        // Apply custom field mappings
        for (const [sourceField, targetField] of Object.entries(enrichmentOptions.customFields)) {
          if (contact[sourceField]) {
            transformedContact[targetField] = contact[sourceField];
          }
        }

        return transformedContact;
      });
    }

    logger.info(
      `ZoomInfo Contact Discovery completed successfully. Found ${contacts.length} contacts across ${companies.length} companies.`
    );

    return {
      success: true,
      data: formattedData,
      metadata: {
        executionTime: Date.now(),
        apiCallsUsed: Math.ceil(contacts.length / 25) + companies.length + 1, // Estimate
        rateLimitRemaining:
          zoomInfoService.rateLimiter.maxRequests - zoomInfoService.rateLimiter.requests,
      },
    };
  } catch (error) {
    logger.error(`ZoomInfo Contact Discovery failed: ${error.message}`);

    return {
      success: false,
      error: error.message,
      data: {
        contacts: [],
        companies: [],
        summary: {
          contactsFound: 0,
          companiesFound: 0,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      },
    };
  }
};
