// Sample mapping templates for HubSpot standard objects
// Keys are example source paths from context; values are HubSpot property names

export const contactTemplate = {
  'input.contact.firstName': 'firstname',
  'input.contact.lastName': 'lastname',
  'input.contact.email': 'email',
  'input.contact.phone': 'phone',
  'input.contact.mobilePhone': 'mobilephone',
  'input.contact.jobTitle': 'jobtitle',
  'input.contact.lifecycleStage': 'lifecyclestage',
  'input.contact.leadStatus': 'hs_lead_status',
  'input.contact.ownerId': 'hubspot_owner_id',
  'input.contact.website': 'website',
  'input.contact.address': 'address',
  'input.contact.address2': 'address2',
  'input.contact.city': 'city',
  'input.contact.state': 'state',
  'input.contact.postalCode': 'zip',
  'input.contact.country': 'country',
  'input.contact.company': 'company',
};

export const companyTemplate = {
  'input.company.name': 'name',
  'input.company.domain': 'domain',
  'input.company.phone': 'phone',
  'input.company.website': 'website',
  'input.company.address': 'address',
  'input.company.address2': 'address2',
  'input.company.city': 'city',
  'input.company.state': 'state',
  'input.company.postalCode': 'zip',
  'input.company.country': 'country',
  'input.company.industry': 'industry',
  'input.company.numberOfEmployees': 'numberofemployees',
  'input.company.annualRevenue': 'annualrevenue',
  'input.company.lifecycleStage': 'lifecyclestage',
  'input.company.ownerId': 'hubspot_owner_id',
  'input.company.description': 'description',
};

export const emailActivityTemplate = {
  'input.activity.subject': 'hs_email_subject',
  'input.activity.html': 'hs_email_html',
  'input.activity.text': 'hs_email_text',
  'input.activity.direction': 'hs_email_direction',
  'input.activity.status': 'hs_email_status',
  'input.activity.timestamp': 'hs_timestamp',
};

export const callActivityTemplate = {
  'input.activity.title': 'hs_call_title',
  'input.activity.body': 'hs_call_body',
  'input.activity.direction': 'hs_call_direction',
  'input.activity.duration': 'hs_call_duration',
  'input.activity.timestamp': 'hs_timestamp',
};

export const noteActivityTemplate = {
  'input.activity.content': 'hs_note_body',
};

export const dealTemplate = {
  'input.deal.name': 'dealname',
  'input.deal.amount': 'amount',
  'input.deal.closeDate': 'closedate', // ms timestamp
  'input.deal.pipeline': 'pipeline',
  'input.deal.stage': 'dealstage',
  'input.deal.type': 'dealtype',
  'input.deal.ownerId': 'hubspot_owner_id',
  'input.deal.currency': 'deal_currency_code',
  'input.deal.description': 'description',
  'input.deal.probability': 'hs_deal_probability',
};

export function getTemplateFor(object, operation) {
  const obj = (object || '').toLowerCase();
  const op = (operation || '').toLowerCase();

  if (obj === 'contact') return contactTemplate;
  if (obj === 'company') return companyTemplate;
  if (obj === 'deal') return dealTemplate;
  if (obj === 'email' || op === 'createemail') return emailActivityTemplate;
  if (obj === 'call' || op === 'createcall') return callActivityTemplate;
  if (op === 'createnote' || obj === 'note') return noteActivityTemplate;
  return null;
}
