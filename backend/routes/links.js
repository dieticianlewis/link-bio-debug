// backend/routes/links.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/db');
// authMiddleware is applied in index.js for all /api/links routes, so req.localUser should be available.

// POST /api/links - Create a new link
router.post('/', async (req, res) => {
  const { title, url, order } = req.body;
  const userId = req.localUser?.id; // From authMiddleware

  if (!userId) {
    return res.status(403).json({ message: "User profile not set up or not authenticated properly." });
  }
  if (!title || !url) {
    return res.status(400).json({ message: "Title and URL are required." });
  }

  try {
    const newLink = await prisma.link.create({
      data: {
        title,
        url,
        order: order ? parseInt(order) : null,
        userId: userId,
      },
    });
    res.status(201).json(newLink);
  } catch (error) {
    console.error("Error creating link:", error);
    res.status(500).json({ message: "Failed to create link.", error: error.message });
  }
});

// GET /api/links - Get all links for the authenticated user
router.get('/', async (req, res) => {
  const userId = req.localUser?.id;

  if (!userId) {
    return res.status(403).json({ message: "User profile not set up or not authenticated properly." });
  }

  try {
    const links = await prisma.link.findMany({
      where: { userId: userId },
      orderBy: { order: 'asc' }, // Optional: order by the 'order' field
    });
    res.json(links);
  } catch (error) {
    console.error("Error fetching links:", error);
    res.status(500).json({ message: "Failed to fetch links.", error: error.message });
  }
});

// PUT /api/links/:linkId - Update a specific link
router.put('/:linkId', async (req, res) => {
  const { linkId } = req.params;
  const { title, url, order } = req.body;
  const userId = req.localUser?.id;

  if (!userId) {
    return res.status(403).json({ message: "User profile not set up or not authenticated properly." });
  }

  try {
    // First, verify the link belongs to the user
    const link = await prisma.link.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      return res.status(404).json({ message: "Link not found." });
    }
    if (link.userId !== userId) {
      return res.status(403).json({ message: "Forbidden: You do not own this link." });
    }

    const updatedLink = await prisma.link.update({
      where: { id: linkId },
      data: {
        title,
        url,
        order: order ? parseInt(order) : undefined, // Only update if provided
      },
    });
    res.json(updatedLink);
  } catch (error) {
    console.error("Error updating link:", error);
    res.status(500).json({ message: "Failed to update link.", error: error.message });
  }
});

// DELETE /api/links/:linkId - Delete a specific link
router.delete('/:linkId', async (req, res) => {
  const { linkId } = req.params;
  const userId = req.localUser?.id;

  if (!userId) {
    return res.status(403).json({ message: "User profile not set up or not authenticated properly." });
  }

  try {
    const link = await prisma.link.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      return res.status(404).json({ message: "Link not found." });
    }
    if (link.userId !== userId) {
      return res.status(403).json({ message: "Forbidden: You do not own this link." });
    }

    await prisma.link.delete({
      where: { id: linkId },
    });
    res.status(204).send(); // No content
  } catch (error) {
    console.error("Error deleting link:", error);
    res.status(500).json({ message: "Failed to delete link.", error: error.message });
  }
});

module.exports = router;