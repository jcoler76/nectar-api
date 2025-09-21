const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');

const router = express.Router();

// Get admin API URL and service key from environment
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:4001'
const ADMIN_SERVICE_API_KEY = process.env.ADMIN_SERVICE_API_KEY;

// Create a new contact conversation
router.post('/start', async (req, res) => {
  try {
    const { url, source = 'marketing_chat', name, email, company } = req.body;

    // Extract UTM parameters from URL if provided
    let utm = null;
    if (url) {
      try {
        const urlObj = new URL(url);
        const utmParams = {};
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
          if (urlObj.searchParams.has(param)) {
            utmParams[param] = urlObj.searchParams.get(param);
          }
        });
        if (Object.keys(utmParams).length > 0) {
          utm = utmParams;
        }
      } catch (e) {
        // Invalid URL, ignore UTM extraction
      }
    }

    // Create contact in CRM
    const contactData = {
      name: name || null,
      email: email || null,
      company: company || null,
      source,
      url,
      utm,
      leadStatus: 'NEW'
    };

    const contactResponse = await fetch(`${ADMIN_API_URL}/api/crm/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': ADMIN_SERVICE_API_KEY
      },
      body: JSON.stringify(contactData)
    });

    if (!contactResponse.ok) {
      throw new Error('Failed to create contact');
    }

    const contactResult = await contactResponse.json();
    const contact = contactResult.data;

    // Create conversation
    const conversationData = {
      contactId: contact.id,
      status: 'OPEN'
    };

    // For now, we'll store conversations locally since we don't have the conversation API set up
    // In a real implementation, you'd want to create this through the CRM API
    const conversationId = crypto.randomUUID();

    res.json({
      success: true,
      conversationId,
      contactId: contact.id,
      nextPrompt: "Hi! I'm here to help you learn more about Nectar Studio. What would you like to know?"
    });

  } catch (error) {
    console.error('Contact chat start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start conversation'
    });
  }
});

// Send a message in conversation
router.post('/message', async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing conversationId or message'
      });
    }

    // Simple bot responses - in a real implementation you'd integrate with an AI service
    const botResponses = [
      "Thanks for your interest! Nectar Studio helps automate business workflows and create APIs from databases instantly. What specific challenges are you looking to solve?",
      "That's a great question! Our platform can help with workflow automation, database API creation, and business intelligence. Would you like to schedule a demo to see it in action?",
      "I'd be happy to help you get started! You can sign up for a free trial or schedule a demo with our team. What works better for you?",
      "Nectar Studio offers enterprise-grade security with OWASP Top 10 compliance. We also provide real-time analytics and team collaboration features. Is there a particular feature you'd like to know more about?"
    ];

    const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];

    res.json({
      success: true,
      reply: randomResponse
    });

  } catch (error) {
    console.error('Contact chat message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Demo request endpoint
router.post('/demo-request', async (req, res) => {
  try {
    const { name, email, company, phone, message, source = 'demo_form' } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Create contact in CRM
    const contactData = {
      name,
      email,
      company: company || null,
      phone: phone || null,
      source,
      leadStatus: 'NEW',
      leadScore: 10 // Demo requests get higher lead score
    };

    const contactResponse = await fetch(`${ADMIN_API_URL}/api/crm/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': ADMIN_SERVICE_API_KEY
      },
      body: JSON.stringify(contactData)
    });

    if (!contactResponse.ok) {
      throw new Error('Failed to create contact');
    }

    const contactResult = await contactResponse.json();
    const contact = contactResult.data;

    // Add a note if message was provided
    if (message && message.trim()) {
      await fetch(`${ADMIN_API_URL}/api/crm/contacts/${contact.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': ADMIN_SERVICE_API_KEY
        },
        body: JSON.stringify({
          body: `Demo request message: ${message.trim()}`
        })
      });
    }

    res.json({
      success: true,
      message: 'Demo request submitted successfully',
      contactId: contact.id
    });

  } catch (error) {
    console.error('Demo request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit demo request'
    });
  }
});

module.exports = router;