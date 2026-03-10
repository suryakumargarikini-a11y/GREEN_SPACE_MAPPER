const express = require('express');
const multer = require('multer');
const Space = require('../models/Space');
const { uploadToFirebase } = require('../services/firebase');

const router = express.Router();

// Multer stores file in memory so we can upload to Firebase
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB max

// ── GET /api/spaces ─────────────────────────────────────────────────────────
// Returns all spaces, optionally filtered by comma-separated facilities query param.
// Example: GET /api/spaces?facilities=playground,benches
router.get('/', async (req, res) => {
    try {
        const query = {};
        if (req.query.facilities) {
            const facilityList = req.query.facilities.split(',').map((f) => f.trim());
            // Match spaces that have ALL requested facilities
            query.facilities = { $all: facilityList };
        }
        const spaces = await Space.find(query).sort({ createdAt: -1 });
        res.json(spaces);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/spaces/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const space = await Space.findById(req.params.id);
        if (!space) return res.status(404).json({ error: 'Space not found' });
        res.json(space);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/spaces ────────────────────────────────────────────────────────
// Creates a new green space. Accepts multipart/form-data (for image upload).
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name, description, lat, lng, area, facilities } = req.body;

        // Parse facilities – could be JSON array string or comma-separated
        let parsedFacilities = [];
        if (facilities) {
            try {
                parsedFacilities = JSON.parse(facilities);
            } catch {
                parsedFacilities = facilities.split(',').map((f) => f.trim());
            }
        }

        // Upload image to Firebase Storage if provided
        let imageUrl = '';
        if (req.file) {
            imageUrl = await uploadToFirebase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype
            );
        }

        const space = await Space.create({
            name,
            description,
            location: { lat: parseFloat(lat), lng: parseFloat(lng) },
            area,
            facilities: parsedFacilities,
            imageUrl,
        });

        res.status(201).json(space);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ── PUT /api/spaces/:id ─────────────────────────────────────────────────────
// Update a green space (supports image re-upload).
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { name, description, lat, lng, area, facilities } = req.body;

        let parsedFacilities = [];
        if (facilities) {
            try {
                parsedFacilities = JSON.parse(facilities);
            } catch {
                parsedFacilities = facilities.split(',').map((f) => f.trim());
            }
        }

        const update = {
            name,
            description,
            location: { lat: parseFloat(lat), lng: parseFloat(lng) },
            area,
            facilities: parsedFacilities,
        };

        if (req.file) {
            update.imageUrl = await uploadToFirebase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype
            );
        }

        const space = await Space.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!space) return res.status(404).json({ error: 'Space not found' });
        res.json(space);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ── DELETE /api/spaces/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const space = await Space.findByIdAndDelete(req.params.id);
        if (!space) return res.status(404).json({ error: 'Space not found' });
        res.json({ message: 'Space deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
