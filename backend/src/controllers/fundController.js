const FundModel = require('../models/fundModel');

// ─── FONDO ────────────────────────────────────────────────────────────────────

const getFund = async (req, res) => {
    try {
        const fund = await FundModel.getFund();
        res.json(fund || { total_amount: 0, description: '' });
    } catch (error) {
        console.error('Error in getFund:', error);
        res.status(500).json({ error: 'Error al obtener el fondo' });
    }
};

const upsertFund = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden modificar el fondo' });
        }
        const { total_amount, description } = req.body;
        if (!total_amount) return res.status(400).json({ error: 'El monto total es requerido' });
        const fund = await FundModel.upsertFund({ total_amount, description });
        res.json(fund);
    } catch (error) {
        console.error('Error in upsertFund:', error);
        res.status(500).json({ error: 'Error al actualizar el fondo' });
    }
};

// ─── CATEGORÍAS ───────────────────────────────────────────────────────────────

const getCategories = async (req, res) => {
    try {
        const categories = await FundModel.findAllCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Error al listar las categorías' });
    }
};

const createCategory = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden crear categorías' });
        }
        const { name, color } = req.body;
        if (!name) return res.status(400).json({ error: 'El nombre es requerido' });
        const category = await FundModel.createCategory({ name, color });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la categoría' });
    }
};

const updateCategory = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden editar categorías' });
        }
        const { id } = req.params;
        const updated = await FundModel.updateCategory(id, req.body);
        if (!updated) return res.status(404).json({ error: 'Categoría no encontrada' });
        res.json({ message: 'Categoría actualizada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar la categoría' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden eliminar categorías' });
        }
        const { id } = req.params;
        const deleted = await FundModel.deleteCategory(id);
        if (!deleted) return res.status(404).json({ error: 'Categoría no encontrada' });
        res.json({ message: 'Categoría eliminada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la categoría' });
    }
};

// ─── MOVIMIENTOS ──────────────────────────────────────────────────────────────

const getMovements = async (req, res) => {
    try {
        const movements = await FundModel.findAllMovements();
        res.json(movements);
    } catch (error) {
        res.status(500).json({ error: 'Error al listar los movimientos' });
    }
};

const createMovement = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden registrar movimientos' });
        }
        const { amount, description, date, category_id } = req.body;
        if (!amount || !description || !date) {
            return res.status(400).json({ error: 'Monto, descripción y fecha son requeridos' });
        }
        const id = await FundModel.createMovement({
            amount, description, date, category_id,
            created_by_user_id: req.user.id
        });
        res.status(201).json({ message: 'Movimiento registrado', id });
    } catch (error) {
        console.error('Error in createMovement:', error);
        res.status(500).json({ error: 'Error al registrar el movimiento' });
    }
};

const updateMovement = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden editar movimientos' });
        }
        const { id } = req.params;
        const updated = await FundModel.updateMovement(id, req.body);
        if (!updated) return res.status(404).json({ error: 'Movimiento no encontrado' });
        res.json({ message: 'Movimiento actualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el movimiento' });
    }
};

const deleteMovement = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden eliminar movimientos' });
        }
        const { id } = req.params;
        const deleted = await FundModel.deleteMovement(id);
        if (!deleted) return res.status(404).json({ error: 'Movimiento no encontrado' });
        res.json({ message: 'Movimiento eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el movimiento' });
    }
};

module.exports = {
    getFund, upsertFund,
    getCategories, createCategory, updateCategory, deleteCategory,
    getMovements, createMovement, updateMovement, deleteMovement,
};
