// backend/lib/db.js
const { PrismaClient } = require('@prisma/client');

// This creates a single, shared instance of the PrismaClient.
// It's the "singleton" pattern.
const prisma = new PrismaClient();

module.exports = { prisma };