"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuth_1 = require("@/middleware/adminAuth");
const database_1 = require("@/utils/database");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(adminAuth_1.authenticateAdmin);
router.get('/contacts', async (req, res) => {
    try {
        const q = req.query.q?.toLowerCase();
        const status = req.query.status;
        const owner = req.query.owner;
        const limit = Math.min(Number(req.query.limit || 50), 100);
        const offset = Number(req.query.offset || 0);
        const where = {};
        if (q) {
            where.OR = [
                { email: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
                { company: { contains: q, mode: 'insensitive' } }
            ];
        }
        if (status) {
            where.leadStatus = status;
        }
        if (owner) {
            where.owner = { contains: owner, mode: 'insensitive' };
        }
        const contacts = await database_1.prisma.contact.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip: offset
        });
        res.json({ success: true, data: contacts });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to list contacts' });
    }
});
router.post('/contacts', async (req, res) => {
    try {
        const { name, email, company, phone, source, url, utm, leadScore, leadStatus, owner, tags } = req.body || {};
        const contact = await database_1.prisma.contact.create({
            data: {
                name: name || null,
                email: email || null,
                company: company || null,
                phone: phone || null,
                source: source || null,
                url: url || null,
                utm: utm || null,
                leadScore: typeof leadScore === 'number' ? leadScore : 0,
                leadStatus: leadStatus || client_1.ContactStatus.NEW,
                owner: owner || null,
                tags: Array.isArray(tags) ? tags : []
            }
        });
        res.status(201).json({ success: true, data: contact });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to create contact' });
    }
});
router.get('/contacts/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const contact = await database_1.prisma.contact.findUnique({
            where: { id },
            include: {
                conversations: {
                    include: {
                        messages: true
                    }
                },
                notes: true
            }
        });
        if (!contact) {
            return res.status(404).json({ success: false, error: 'Contact not found' });
        }
        res.json({ success: true, data: contact });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to get contact' });
    }
});
router.patch('/contacts/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { name, email, company, phone, leadScore, leadStatus, owner, tags } = req.body || {};
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (email !== undefined)
            updateData.email = email;
        if (company !== undefined)
            updateData.company = company;
        if (phone !== undefined)
            updateData.phone = phone;
        if (typeof leadScore === 'number')
            updateData.leadScore = leadScore;
        if (leadStatus)
            updateData.leadStatus = leadStatus;
        if (owner !== undefined)
            updateData.owner = owner;
        if (Array.isArray(tags))
            updateData.tags = tags;
        const contact = await database_1.prisma.contact.update({
            where: { id },
            data: updateData
        });
        res.json({ success: true, data: contact });
    }
    catch (e) {
        if (e.code === 'P2025') {
            return res.status(404).json({ success: false, error: 'Contact not found' });
        }
        res.status(500).json({ success: false, error: e?.message || 'Failed to update contact' });
    }
});
router.delete('/contacts/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await database_1.prisma.contact.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (e) {
        if (e.code === 'P2025') {
            return res.status(404).json({ success: false, error: 'Contact not found' });
        }
        res.status(500).json({ success: false, error: e?.message || 'Failed to delete contact' });
    }
});
router.get('/conversations', async (req, res) => {
    try {
        const status = req.query.status;
        const limit = Math.min(Number(req.query.limit || 50), 100);
        const offset = Number(req.query.offset || 0);
        const where = {};
        if (status) {
            where.status = status;
        }
        const conversations = await database_1.prisma.contactConversation.findMany({
            where,
            include: {
                contact: {
                    select: {
                        email: true,
                        name: true,
                        company: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip: offset
        });
        res.json({ success: true, data: conversations });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to list conversations' });
    }
});
router.get('/conversations/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const conversation = await database_1.prisma.contactConversation.findUnique({
            where: { id },
            include: {
                contact: {
                    select: {
                        email: true,
                        name: true,
                        company: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        res.json({ success: true, data: conversation });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to get conversation' });
    }
});
router.patch('/conversations/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { status, assignedTo } = req.body || {};
        const updateData = {};
        if (status)
            updateData.status = status;
        if (assignedTo !== undefined)
            updateData.assignedTo = assignedTo;
        await database_1.prisma.contactConversation.update({
            where: { id },
            data: updateData
        });
        res.json({ success: true });
    }
    catch (e) {
        if (e.code === 'P2025') {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        res.status(500).json({ success: false, error: e?.message || 'Failed to update conversation' });
    }
});
// Convert lead to customer (simple: mark as converted; optional: future user/org creation)
router.post('/contacts/:id/convert', async (req, res) => {
    try {
        const id = req.params.id;
        const contact = await database_1.prisma.contact.update({
            where: { id },
            data: { leadStatus: client_1.ContactStatus.CONVERTED }
        });
        res.json({ success: true, data: contact });
    }
    catch (e) {
        if (e.code === 'P2025') {
            return res.status(404).json({ success: false, error: 'Contact not found' });
        }
        res.status(500).json({ success: false, error: e?.message || 'Failed to convert lead' });
    }
});
// Notes endpoints
router.get('/contacts/:id/notes', async (req, res) => {
    try {
        const id = req.params.id;
        const notes = await database_1.prisma.contactNote.findMany({
            where: { contactId: id },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: notes });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to list notes' });
    }
});
router.post('/contacts/:id/notes', async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body?.body || '';
        const createdBy = req.admin?.id || null;
        const note = await database_1.prisma.contactNote.create({
            data: {
                contactId: id,
                body,
                createdBy
            }
        });
        res.status(201).json({ success: true, data: note });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to create note' });
    }
});
router.delete('/contacts/:id/notes/:noteId', async (req, res) => {
    try {
        await database_1.prisma.contactNote.delete({
            where: {
                id: req.params.noteId,
                contactId: req.params.id
            }
        });
        res.json({ success: true });
    }
    catch (e) {
        if (e.code === 'P2025') {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        res.status(500).json({ success: false, error: e?.message || 'Failed to delete note' });
    }
});
exports.default = router;
//# sourceMappingURL=crm.js.map