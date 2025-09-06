// Basic email-to-SMS gateway mapping for major US carriers
// Note: Delivery is not guaranteed and may truncate messages.

const CARRIERS = {
  att: { name: 'AT&T', domain: 'txt.att.net' },
  verizon: { name: 'Verizon', domain: 'vtext.com' },
  tmobile: { name: 'T-Mobile', domain: 'tmomail.net' },
  sprint: { name: 'Sprint', domain: 'messaging.sprintpcs.com' },
  uscellular: { name: 'US Cellular', domain: 'email.uscc.net' },
  cricket: { name: 'Cricket', domain: 'sms.cricketwireless.net' },
  metro: { name: 'MetroPCS', domain: 'mymetropcs.com' },
  boost: { name: 'Boost Mobile', domain: 'sms.myboostmobile.com' },
  googlefi: { name: 'Google Fi', domain: 'msg.fi.google.com' },
  ting: { name: 'Ting', domain: 'message.ting.com' },
  visible: { name: 'Visible', domain: 'vtext.com' }, // Uses Verizon gateway
};

const normalizePhone = phone => {
  if (!phone) return null;
  // Keep digits only
  const digits = String(phone).replace(/\D/g, '');
  // US numbers: ensure 10 digits; allow 11 with leading 1
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  if (digits.length === 10) return digits;
  return null;
};

function getSmsEmailForCarrier(phone, carrierKey) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const carrier = CARRIERS[carrierKey?.toLowerCase?.()];
  if (!carrier) return null;
  return `${normalized}@${carrier.domain}`;
}

function supportedCarriers() {
  return Object.entries(CARRIERS).map(([key, v]) => ({ key, name: v.name }));
}

module.exports = { getSmsEmailForCarrier, supportedCarriers };
