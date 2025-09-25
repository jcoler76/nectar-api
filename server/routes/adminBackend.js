const express = require('express');
const router = express.Router();
const prismaService = require('../services/prismaService');
const bcrypt = require('bcryptjs');

const prisma = prismaService.systemPrisma;

// Auth routes
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Look for superadmin user in the User table
    const superUser = await prisma.user.findFirst({
      where: {
        email,
        isSuperAdmin: true,
      },
    });

    if (!superUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check password
    if (superUser.passwordHash && (await bcrypt.compare(password, superUser.passwordHash))) {
      return res.json({
        success: true,
        user: {
          id: superUser.id,
          email: superUser.email,
          name: `${superUser.firstName} ${superUser.lastName}`,
          role: 'SUPER_ADMIN',
          isActive: superUser.isActive,
        },
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.get('/auth/user/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Look for superadmin user in the User table
    const superUser = await prisma.user.findFirst({
      where: {
        id,
        isSuperAdmin: true,
      },
    });

    if (!superUser) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
        },
      });
    }

    return res.json({
      id: superUser.id,
      email: superUser.email,
      name: `${superUser.firstName} ${superUser.lastName}`,
      role: 'SUPER_ADMIN',
      isActive: superUser.isActive,
    });
  } catch (error) {
    console.error('Get admin user error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

router.put('/auth/user/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.put('/auth/user/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Deactivate admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// User management routes
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isActive, isAdmin } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (isAdmin !== undefined) {
      where.isAdmin = isAdmin === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: parseInt(offset),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          memberships: {
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Format users for admin frontend
    const formattedUsers = users.map(user => {
      // Get the primary organization from memberships (first one if multiple)
      const primaryMembership = user.memberships[0];
      const organization = primaryMembership?.organization || null;

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        isActive: user.isActive,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        lastLogin: user.lastLoginAt,
        organization: organization,
        roles: [], // Users don't have direct roles in this schema
        memberships: user.memberships.map(membership => ({
          role: membership.role,
          joinedAt: membership.joinedAt,
          organization: membership.organization,
        })),
      };
    });

    res.json({
      users: formattedUsers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { email, firstName, lastName, password, isAdmin, isActive } = req.body;

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash: hashedPassword,
        isAdmin: isAdmin || false,
        isActive: isActive !== false,
      },
      include: {
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Format user for admin frontend
    const primaryMembership = user.memberships[0];
    const organization = primaryMembership?.organization || null;

    const formattedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      isActive: user.isActive,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      organization: organization,
      roles: [],
    };

    res.json({
      success: true,
      user: formattedUser,
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Format user for admin frontend
    const primaryMembership = user.memberships[0];
    const organization = primaryMembership?.organization || null;

    const formattedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      isActive: user.isActive,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      organization: organization,
      roles: [],
    };

    res.json(formattedUser);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: updates,
      include: {
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Format user for admin frontend
    const primaryMembership = user.memberships[0];
    const organization = primaryMembership?.organization || null;

    const formattedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      isActive: user.isActive,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      organization: organization,
      roles: [],
    };

    res.json({
      success: true,
      user: formattedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Audit log routes
router.post('/audit-log', async (req, res) => {
  try {
    const auditData = req.body;

    // For now, just log to console as we don't have audit log table
    console.log('Audit Log:', auditData);

    res.json({ success: true });
  } catch (error) {
    console.error('Audit log error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// CRM Contact Routes
router.get('/crm/contacts', async (req, res) => {
  try {
    const {
      q = '',
      status = '',
      owner = '',
      source = '',
      created_after = '',
      created_before = '',
      score_min = '',
      score_max = '',
      limit = 25,
      offset = 0,
    } = req.query;

    const where = {};
    const filters = [];

    // Search across name, email, company
    if (q) {
      filters.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { company: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    // Filter by lead status
    if (status) {
      filters.push({ leadStatus: status });
    }

    // Filter by owner
    if (owner) {
      filters.push({ owner: { contains: owner, mode: 'insensitive' } });
    }

    // Filter by source
    if (source) {
      filters.push({ source: { contains: source, mode: 'insensitive' } });
    }

    // Date range filters
    if (created_after || created_before) {
      const dateFilter = {};
      if (created_after) dateFilter.gte = new Date(created_after);
      if (created_before) dateFilter.lte = new Date(created_before);
      filters.push({ createdAt: dateFilter });
    }

    // Lead score range
    if (score_min || score_max) {
      const scoreFilter = {};
      if (score_min) scoreFilter.gte = parseInt(score_min);
      if (score_max) scoreFilter.lte = parseInt(score_max);
      filters.push({ leadScore: scoreFilter });
    }

    if (filters.length > 0) {
      where.AND = filters;
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip: parseInt(offset),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          phone: true,
          source: true,
          leadScore: true,
          leadStatus: true,
          owner: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.contact.count({ where }),
    ]);

    // Transform the data to match the frontend expectations
    const transformedContacts = contacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      company: contact.company,
      phone: contact.phone,
      source: contact.source,
      lead_score: contact.leadScore,
      lead_status: contact.leadStatus,
      owner: contact.owner,
      tags: contact.tags,
      created_at: contact.createdAt,
      updated_at: contact.updatedAt,
    }));

    res.json({
      data: transformedContacts,
      total,
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.post('/crm/contacts', async (req, res) => {
  try {
    const { name, email, company, phone, leadScore, leadStatus, owner } = req.body;

    const contact = await prisma.contact.create({
      data: {
        name: name || null,
        email: email || null,
        company: company || null,
        phone: phone || null,
        leadScore: leadScore || 0,
        leadStatus: leadStatus || 'NEW',
        owner: owner || null,
        source: 'manual', // Default source for manually created contacts
        tags: [],
      },
    });

    res.json({
      success: true,
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        company: contact.company,
        phone: contact.phone,
        lead_score: contact.leadScore,
        lead_status: contact.leadStatus,
        owner: contact.owner,
        tags: contact.tags,
        created_at: contact.createdAt,
        updated_at: contact.updatedAt,
      },
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.get('/crm/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        conversations: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!contact) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Contact not found',
        },
      });
    }

    res.json({
      data: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        company: contact.company,
        phone: contact.phone,
        source: contact.source,
        lead_score: contact.leadScore,
        lead_status: contact.leadStatus,
        owner: contact.owner,
        tags: contact.tags,
        created_at: contact.createdAt,
        updated_at: contact.updatedAt,
        notes: contact.notes,
        conversations: contact.conversations,
      },
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

router.patch('/crm/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, company, phone, leadScore, leadStatus, owner } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (company !== undefined) updateData.company = company;
    if (phone !== undefined) updateData.phone = phone;
    if (leadScore !== undefined) updateData.leadScore = leadScore;
    if (leadStatus !== undefined) updateData.leadStatus = leadStatus;
    if (owner !== undefined) updateData.owner = owner;

    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        company: contact.company,
        phone: contact.phone,
        lead_score: contact.leadScore,
        lead_status: contact.leadStatus,
        owner: contact.owner,
        tags: contact.tags,
        created_at: contact.createdAt,
        updated_at: contact.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update contact error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.delete('/crm/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.contact.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.patch('/crm/contacts/bulk', async (req, res) => {
  try {
    const { ids, action, value } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing contact IDs',
      });
    }

    let updateData = {};
    let updatedCount = 0;

    switch (action) {
      case 'status':
        if (!value) {
          return res.status(400).json({
            success: false,
            message: 'Status value required',
          });
        }
        updateData = { leadStatus: value };
        break;

      case 'owner':
        if (!value) {
          return res.status(400).json({
            success: false,
            message: 'Owner value required',
          });
        }
        updateData = { owner: value };
        break;

      case 'delete':
        const deleteResult = await prisma.contact.deleteMany({
          where: { id: { in: ids } },
        });
        return res.json({
          success: true,
          updated: deleteResult.count,
        });

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action',
        });
    }

    if (Object.keys(updateData).length > 0) {
      const updateResult = await prisma.contact.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      });
      updatedCount = updateResult.count;
    }

    res.json({
      success: true,
      updated: updatedCount,
    });
  } catch (error) {
    console.error('Bulk update contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.post('/crm/contacts/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.contact.update({
      where: { id },
      data: {
        leadStatus: 'CONVERTED',
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Convert contact error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Contact Notes Routes
router.get('/crm/contacts/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;

    const notes = await prisma.contactNote.findMany({
      where: { contactId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      data: notes.map(note => ({
        id: note.id,
        body: note.body,
        created_by: note.createdBy,
        created_at: note.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get contact notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.post('/crm/contacts/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note body is required',
      });
    }

    const note = await prisma.contactNote.create({
      data: {
        contactId: id,
        body: body.trim(),
        createdBy: null, // TODO: Add user context when available
      },
    });

    res.json({
      success: true,
      note: {
        id: note.id,
        body: note.body,
        created_by: note.createdBy,
        created_at: note.createdAt,
      },
    });
  } catch (error) {
    console.error('Create contact note error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.delete('/crm/contacts/:id/notes/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;

    await prisma.contactNote.delete({
      where: { id: noteId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete contact note error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Conversation Routes
router.get('/crm/conversations', async (req, res) => {
  try {
    const conversations = await prisma.contactConversation.findMany({
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      conversations: conversations.map(conv => ({
        id: conv.id,
        contact: conv.contact,
        status: conv.status,
        assignedTo: conv.assignedTo,
        messageCount: conv._count.messages,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
      total: conversations.length,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.get('/crm/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.contactConversation.findUnique({
      where: { id },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        },
      });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

router.patch('/crm/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    const conversation = await prisma.contactConversation.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Analytics Routes
router.get('/crm/analytics', async (req, res) => {
  try {
    const [totalContacts, newContacts, qualifiedContacts, convertedContacts, lostContacts] =
      await Promise.all([
        prisma.contact.count(),
        prisma.contact.count({ where: { leadStatus: 'NEW' } }),
        prisma.contact.count({ where: { leadStatus: 'QUALIFIED' } }),
        prisma.contact.count({ where: { leadStatus: 'CONVERTED' } }),
        prisma.contact.count({ where: { leadStatus: 'CLOSED' } }),
      ]);

    const conversionRate =
      totalContacts > 0 ? ((convertedContacts / totalContacts) * 100).toFixed(2) : 0;

    res.json({
      totalContacts,
      newContacts,
      qualifiedContacts,
      convertedContacts,
      lostContacts,
      conversionRate: parseFloat(conversionRate),
      revenue: 0, // TODO: Calculate actual revenue when billing data is available
    });
  } catch (error) {
    console.error('Get CRM analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Pipeline Routes
router.get('/crm/pipeline', async (req, res) => {
  try {
    const pipeline = await prisma.contact.groupBy({
      by: ['leadStatus'],
      _count: {
        leadStatus: true,
      },
    });

    const stages = [
      { id: 'NEW', name: 'New Leads', count: 0 },
      { id: 'QUALIFIED', name: 'Qualified', count: 0 },
      { id: 'NEGOTIATING', name: 'Negotiating', count: 0 },
      { id: 'CONVERTED', name: 'Converted', count: 0 },
      { id: 'CLOSED', name: 'Lost', count: 0 },
    ];

    pipeline.forEach(stage => {
      const stageIndex = stages.findIndex(s => s.id === stage.leadStatus);
      if (stageIndex !== -1) {
        stages[stageIndex].count = stage._count.leadStatus;
      }
    });

    res.json({
      stages,
      deals: [], // TODO: Add deals functionality when needed
    });
  } catch (error) {
    console.error('Get CRM pipeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Placeholder routes for billing (implement as needed)
router.get('/billing/stripe-config', async (req, res) => {
  res.json({ success: true, data: {} });
});

router.put('/billing/stripe-config', async (req, res) => {
  res.json({ success: true });
});

router.post('/billing/create-customer', async (req, res) => {
  res.json({ success: true });
});

router.get('/billing/organization/:id', async (req, res) => {
  res.json({ success: true, data: {} });
});

router.post('/billing/sync-subscription', async (req, res) => {
  res.json({ success: true });
});

router.post('/billing/billing-event', async (req, res) => {
  res.json({ success: true });
});

router.put('/billing/subscription/:id/cancel', async (req, res) => {
  res.json({ success: true });
});

router.get('/billing/subscription/:id', async (req, res) => {
  res.json({ success: true, data: {} });
});

router.post('/billing/revenue-metric', async (req, res) => {
  res.json({ success: true });
});

router.get('/billing/revenue-analytics', async (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/billing/subscription-analytics', async (req, res) => {
  res.json({ success: true, data: {} });
});

router.get('/billing/upcoming-renewals', async (req, res) => {
  res.json({ success: true, data: [] });
});

// Admin Dashboard Metrics
router.get('/admin/metrics', async (req, res) => {
  try {
    console.log('[METRICS] Browser request received');
    console.log('[METRICS] User-Agent:', req.get('User-Agent'));
    console.log('[METRICS] Origin:', req.get('Origin'));
    console.log('[METRICS] Referrer:', req.get('Referrer'));

    // Get user statistics
    const [totalUsers, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    // Get subscription statistics (if you have subscription model)
    // For now, using Organization as a proxy for subscriptions
    const totalSubscriptions = await prisma.organization.count();

    // Calculate monthly revenue (placeholder - would need actual billing data)
    const monthlyRevenue = 0; // TODO: Implement based on your billing system

    const metrics = {
      totalUsers,
      activeUsers,
      totalSubscriptions,
      monthlyRevenue,
    };

    console.log('[METRICS] Sending response:', metrics);
    res.json(metrics);
  } catch (error) {
    console.error('Admin metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin metrics',
    });
  }
});

module.exports = router;
