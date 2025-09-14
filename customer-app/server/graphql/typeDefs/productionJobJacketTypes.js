const { gql } = require('apollo-server-express');

const productionJobJacketTypes = gql`
  type ProductionJobJacket {
    # Contract Information
    contractId: ID!
    contractIdWithLink: String
    jobJacket: String
    issue: String
    issueId: ID
    issueDate: String
    issueStartDate: String
    issueOrder: Int
    issueMonth: Int
    issueMonthName: String
    issueYear: Int
    zone: String
    zoneId: ID
    net: Float
    gross: Float
    barter: Float

    # Ad Information
    adSize: String
    adSizeActual: String
    adName: String
    adColumns: Int
    adInches: Float
    adSection: String
    adPosition: String
    adColor: String
    adFrequency: String
    adNotes: String
    adNumber: String
    isBleed: Boolean

    # Contract Dates
    contractAddedDate: String
    contractModifiedDate: String
    contractStartDate: String
    contractEndDate: String
    dateDue: String

    # Production Information
    dateAdArrived: String
    requiresDesign: Boolean
    adArrived: Boolean
    date1stProof: String
    date1stChanges: String
    date2ndProof: String
    date2ndChanges: String
    date3rdProof: String
    dateAdDone: String
    currentStage: String
    currentStageId: ID
    contractStatus: String

    # Financial Information
    contractCommissionPercent: Float
    contractCommissionNet: Float
    contractCommissionCash: Float
    productionCharge: Float
    cardRate: Float
    discount: Float
    adjustments: Float
    adjustmentsString: String
    glRevenue: String
    glReceivable: String
    contractPageRate: Float

    # Customer Information
    customerId: ID!
    companyName: String
    companyNameWithContact: String
    customerPrefix: String
    customerFirstName: String
    customerMiddleName: String
    customerLastName: String
    customerSuffix: String
    customerNickname: String
    customerEmail: String
    customerEmailWithLink: String
    customerEmail2: String
    billingAltEmails: String
    customerPhone: String
    customerPhoneExt: String
    customerCellPhone: String
    customerAltPhone: String
    customerUrl: String
    customerFax: String
    customerAddress: String
    customerAddress2: String
    customerCity: String
    customerState: String
    customerZipCode: String
    customerCounty: String
    customerCountry: String
    customerTitle: String
    customerCreditLimit: String
    customerTerms: String

    # Customer Metadata
    customerContactGroupId: ID
    customerContactGroup: String
    customerContactGroupString: String
    customerContactGroupYesNo: String
    customerCategoryId: ID
    customerCategory: String
    customerContactType: String
    customerContactTypeId: ID
    customerRepId: ID
    customerRepName: String
    customerRepEmail: String
    customerDoNotFax: Boolean
    customerDoNotEmail: Boolean
    customerQuickBooks: String
    customerPriorityId: ID
    customerPriority: String
    customerFirstContract: String
    customerDateAdded: String
    customerDateLastModified: String
    customerNextCallBack: String
    customerLastContact: String
    customerLastContract: String
    customerFirstContractIssueDate: String
    customerLastContractIssueDate: String
    customerHasStoredCreditCard: Boolean
    customerLastCompList: String
    customerRepsPrimaryAndPartner: String
    customerPartnerRep: String
    customerPartnerRepId: ID

    # Home Address
    homeAddress1: String
    homeAddress2: String
    homeCity: String
    homeState: String
    homeZipCode: String
    homePhone: String

    # Agency Information
    adAgencyId: ID
    adAgency: String
    adAgencyFirstName: String
    adAgencyLastName: String
    adAgencyAddress: String
    adAgencyCity: String
    adAgencyState: String
    adAgencyZipCode: String
    adAgencyCounty: String
    adAgencyCountry: String
    adAgencyEmail: String
    adAgencyEmailWithLink: String
    adAgencyPhone: String
    adAgencyUrl: String
    adAgencyFax: String
    adAgencyPhoneExt: String
    adAgencyDiscount: Float
    adAgencyPercentage: Float
    adAgencyDiscountAmount: Float

    # Billing Information
    accountBilledTo: String
    billingCompanyId: ID
    billingCompany: String
    billingFirstName: String
    billingLastName: String
    billingPhone: String
    billingFax: String
    billingEmail: String
    billingEmail2: String
    billingAddress1: String
    billingAddress2: String
    billingCity: String
    billingState: String
    billingZip: String
    billingCounty: String
    billingCountry: String
    billingContactIds: String

    # Production Contact Information
    productionCompanyNames: String
    productionContacts: String
    productionFirstName: String
    productionLastName: String
    productionPhone: String
    productionFax: String
    productionEmails: String
    productionEmailsWithLink: String
    productionAddress1: String
    productionAddress2: String
    productionCity: String
    productionState: String
    productionZip: String
    productionCounty: String
    productionCountry: String
    productionNotes: String
    productionNoteDate: String
    productionNote: String
    dateOfLastProductionNote: String
    lastProductionNote: String

    # Sales Data
    salesJanuary: Float
    salesFebruary: Float
    salesMarch: Float
    salesApril: Float
    salesMay: Float
    salesJune: Float
    salesJuly: Float
    salesAugust: Float
    salesSeptember: Float
    salesOctober: Float
    salesNovember: Float
    salesDecember: Float
    salesTotal: Float
    salesTotalCurrentYear: Float
    salesTotalPreviousYear: Float

    # Digital Information
    contractDescription: String
    contractCpm: Float
    contractImpressions: String
    contractQuantity: Int
    price: Float
    contractImpressionsActual: String
    contractQuantityActual: Int
    digitalStudioX: Int
    digitalStudioY: Int

    # Business Unit & Magazine
    businessUnit: String
    businessUnitId: ID
    businessUnitDetails: String
    businessUnitProducts: String
    magazineId: ID
    magazineName: String

    # Product Information
    productTypeId: ID
    productType: String
    productIsActive: Boolean
    productCirc: Int

    # Rep Information
    contractCreatedByRepId: ID
    contractCreatedByRep: String
    contractRepName: String
    contractRepId: ID
    contractRepNamesWithSplits: String
    splitRepPercent: Float

    # Rate Card & Position
    rateCardId: ID
    rateCard: String
    pgsFromCompetitor: String
    premiumPosition: String
    withinEdit: String
    acrossEdit: String
    rightHandOnly: String
    positionInventory: Int
    positionInventorySet: Boolean

    # Designer Information
    designer1: String
    designer1Id: ID
    designer2: String
    designer2Id: ID
    assignedToRepId: ID
    assignedToRepName: String

    # Time Tracking
    actualTime: Float
    estimatedTime: Float

    # Adjustment Details
    adjustment: String
    adjustmentId: ID
    adjustmentLineItemId: ID
    adjustmentAmount: Float
    adjustmentNotes: String
    adjustmentType: String
    adjustmentTypeId: Int
    adjustmentNotesString: String

    # Publication Schedule
    pubScheduleMailingListCloseDate: String
    pubScheduleSpaceReservationDeadline: String
    pubScheduleAdMaterialDeadline: String
    pubScheduleFilesShippedToPrinter: String
    pubScheduleProofsArriveFromPrinter: String
    pubSchedulePeriodicalsShippedFromPrinter: String
    pubScheduleAccountingCloseDate: String
    pubScheduleOnSaleDate: String
    pubScheduleVolume: String
    pubSchedulePrintQuantity: Int

    # Display Dates
    issueDateDisplay: String
    contractAddedDateDisplay: String

    # Proposal Information
    proposalId: ID
    proposalReps: String
    insertionId: ID
    pickupFrom: String

    # Classified Information
    contractClassifiedHtmlText: String
    contractClassifiedWordCount: Int
    contractClassifiedCharacterCount: Int
    contractClassifiedTitleText: String
    contractClassifiedPrintText: String
    contractClassifiedSortOrder: Int

    # Column Inches
    ciAdColumn: Int
    ciAdInch: String
    ciTotalColumnInches: String

    # Billing Installments
    billingInstallmentMonth: String
    billingInstallmentDate: String
    billingInstallmentId: ID
    billingInstallmentAmount: Float
    billingInstallmentPercentage: Float
    billingInstallment: Boolean
    billingInstallmentCount: Int
    billingInstallmentFirstDate: String
    billingInstallmentLastDate: String

    # Tax Information
    taxName: String
    taxDescription: String
    taxPercent: Float

    # Account Balance
    customerAccountBalance: Float

    # Page Information
    page: String
    pageOrder: Int

    # Invoice & Payment Information
    paymentDate: String
    paymentAmount: Float
    paymentMemo: String
    paymentMethod: String
    paymentNumber: String
    checkNumber: String
    invoiceId: ID
    invoiceNumber: String
    consolidatedInvoiceId: ID
    consolidatedInvoiceNumber: String
    invoiceTotal: Float
    totalOpenBalance: Float
    invoiceDate: String
    invoiceDueDate: String
    invoiced: Boolean

    # File Information
    fileName: String
    fileNotes: String
    fileCreateDate: String
    fileLinkToJobJacket: String
  }

  input ProductionJobJacketFilter {
    contractId: ID
    customerId: ID
    year: Int
    issueId: ID
    zoneId: ID
    currentStageId: ID
    businessUnitId: ID
    magazineId: ID
    contractRepId: ID
    customerRepId: ID
    productTypeId: ID
    rateCardId: ID
    adArrived: Boolean
    requiresDesign: Boolean
    invoiced: Boolean
    contractStatus: String
    companyName: String
    adSize: String

    # Date Range Filters - The key addition!
    issueDateFrom: String # "2025-06-01"
    issueDateTo: String # "2025-06-30"
    contractAddedDateFrom: String
    contractAddedDateTo: String
    dateAdArrivedFrom: String
    dateAdArrivedTo: String
    dateAdDoneFrom: String
    dateAdDoneTo: String
    dateDueFrom: String
    dateDueTo: String

    # Numeric Range Filters
    netAmountMin: Float # Minimum contract value
    netAmountMax: Float # Maximum contract value
    grossAmountMin: Float
    grossAmountMax: Float

    # Text Search Filters
    customerEmailContains: String
    adNotesContains: String
    productionNotesContains: String

    # Multiple Value Filters
    contractStatusIn: [String!] # ["Ad Done", "Ad Not Done"]
    currentStageIn: [String!] # ["1st Proof", "2nd Proof", "Ad Done"]
    adSizeIn: [String!] # ["Full Page", "Half Page"]
    # Boolean combinations
    hasOpenBalance: Boolean # totalOpenBalance > 0
    hasProductionNotes: Boolean # productionNotes is not null/empty
  }

  input ProductionJobJacketSort {
    field: String!
    direction: String! # ASC or DESC
  }

  type Query {
    productionJobJackets(
      filter: ProductionJobJacketFilter
      sort: ProductionJobJacketSort
      limit: Int = 100
      offset: Int = 0
    ): [ProductionJobJacket!]!

    productionJobJacket(contractId: ID!): ProductionJobJacket
  }
`;

module.exports = productionJobJacketTypes;
