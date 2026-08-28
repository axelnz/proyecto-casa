const express = require('express');
const router = express.Router();
const {
    getFund, upsertFund,
    getCategories, createCategory, updateCategory, deleteCategory,
    getMovements, createMovement, updateMovement, deleteMovement,
} = require('../controllers/fundController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.use(requireAuth);

// Fondo (saldo total)
router.get('/fund', getFund);
router.put('/fund', upsertFund);

// Categorías
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Movimientos
router.get('/movements', getMovements);
router.post('/movements', createMovement);
router.put('/movements/:id', updateMovement);
router.delete('/movements/:id', deleteMovement);

module.exports = router;
