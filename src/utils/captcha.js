// Lightweight, invisible CAPTCHA integration for reCAPTCHA v3 or hCaptcha
// Reads configuration from environment variables:
// - REACT_APP_CAPTCHA_PROVIDER = 'recaptcha' | 'hcaptcha'
// - REACT_APP_RECAPTCHA_SITE_KEY
// - REACT_APP_HCAPTCHA_SITE_KEY

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(s)
  })
}

export async function getCaptchaToken(action = 'checkout') {
  const provider = process.env.REACT_APP_CAPTCHA_PROVIDER
  try {
    if (provider === 'recaptcha') {
      const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY
      if (!siteKey) return null
      await loadScriptOnce(`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`)
      // global grecaptcha
      // eslint-disable-next-line no-undef
      await new Promise((r) => window.grecaptcha.ready(r))
      // eslint-disable-next-line no-undef
      const token = await window.grecaptcha.execute(siteKey, { action })
      return token
    }

    if (provider === 'hcaptcha') {
      const siteKey = process.env.REACT_APP_HCAPTCHA_SITE_KEY
      if (!siteKey) return null
      await loadScriptOnce(`https://js.hcaptcha.com/1/api.js?render=${encodeURIComponent(siteKey)}`)
      // global hcaptcha
      // eslint-disable-next-line no-undef
      const token = await window.hcaptcha.execute(siteKey, { async: true })
      return token
    }
  } catch (e) {
    console.warn('CAPTCHA token generation failed', e)
    return null
  }
  return null
}

