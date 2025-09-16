import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEOHead = ({
  title,
  description,
  keywords,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  structuredData,
}) => {
  const defaultTitle = 'NectarStudio.ai - Automate, Integrate, Elevate Your Business Operations';
  const defaultDescription =
    'Transform your business operations with NectarStudio.ai. Enterprise-grade workflow automation, AI-powered analytics, and seamless integrations. 100% OWASP compliant security. Start your 14-day free trial today.';
  const baseUrl = process.env.REACT_APP_BASE_URL || 'https://nectarstudio.ai';

  const fullTitle = title ? `${title} | NectarStudio.ai` : defaultTitle;
  const metaDescription = description || defaultDescription;
  const canonicalUrl = canonical ? `${baseUrl}${canonical}` : baseUrl;
  const ogImageUrl = ogImage || `${baseUrl}/og-image.png`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || metaDescription} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="NectarStudio.ai" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={ogTitle || fullTitle} />
      <meta name="twitter:description" content={ogDescription || metaDescription} />
      <meta name="twitter:image" content={ogImageUrl} />

      {/* Additional Meta Tags for AI Crawlers */}
      <meta
        name="robots"
        content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
      <meta name="slurp" content="index, follow" />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
