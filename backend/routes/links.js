// backend/routes/links.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/db');
// authMiddleware is applied globally to this router in index.js

// POST /api/links - Create a new link
router.post('/', async (req, res) => {
  if (!req.localUser) return res.status(403).json({ message: "Profile setup required." });
  const { title, url } = req.body;
  if (!title || !url) return res.status(400).json({ message: "Title and URL are required." });

  try {
    const newLink = await prisma.link.create({ data: { title, url, userId: req.localUser.id } });
    res.status(201).json(newLink);
  } catch (error) {
    console.error("[POST /api/links] Error:", error);
    res.status(500).json({ message: "Failed to create link." });
  }
});

// GET /api/links - Get all links for the user
router.get('/', async (req, res) => {
  if (!req.localUser) return res.status(403).json({ message: "Profile setup required." });
  try {
    const links = await prisma.link.findMany({
      where: { userId: req.localUser.id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(links);
  } catch (error) {
    console.error("[GET /api/links] Error:", error);
    res.status(500).json({ message: "Failed to fetch links." });
  }
});

// PUT /api/links/:linkId - Update a link
router.put('/:linkId', async (req, res) => {
  if (!req.localUser) return res.status(403).json({ message: "Profile setup required." });
  const { linkId } = req.params;
  const { title, url, order } = req.body;
  const userId = req.localUser.id;

  const dataToUpdate = {};
  if (title !== undefined) dataToUpdate.title = title;
  if (url !== undefined) dataToUpdate.url = url;
  if (order !== undefined) dataToUpdate.order = (order === null || order === '') ? null : parseInt(order, 10);

  if (Object.keys(dataToUpdate).length === 0) {
    return res.status(400).json({ message: "No update data provided." });
  }

  try {
    const link = await prisma.link.findFirst({ where: { id: linkId, userId } });
    if (!link) return res.status(404).json({ message: "Link not found or unauthorized." });

    const updatedLink = await prisma.link.update({ where: { id: linkId }, data: dataToUpdate });
    res.json(updatedLink);
  } catch (error) {
    console.error(`[PUT /api/links/${linkId}] Error:`, error);
    res.status(500).json({ message: "Failed to update link." });
  }
});

// DELETE /api/links/:linkId - Delete a link
router.delete('/:linkId', async (req, res) => {
  if (!req.localUser) return res.status(403).json({ message: "Profile setup required." });
  const { linkId } = req.params;
  const userId = req.localUser.id;

  try {
    const link = await prisma.link.findFirst({ where: { id: linkId, userId } });
    if (!link) return res.status(404).json({ message: "Link not found or unauthorized." });

    await prisma.link.delete({ where: { id: linkId } });
    res.status(204).send();
  } catch (error) {
    console.error(`[DELETE /api/links/${linkId}] Error:`, error);
    res.status(500).json({ message: "Failed to delete link." });
  }
});

module.exports = router;