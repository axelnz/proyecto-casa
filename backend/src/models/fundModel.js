const pool = require('../config/db');

// ─── FONDO (configuración del saldo total) ────────────────────────────────────

const getFund = async () => {
    const { rows } = await pool.query(`
        SELECT * FROM construction_fund LIMIT 1
    `);
    return rows[0] || null;
};

const upsertFund = async ({ total_amount, description }) => {
    const { rows } = await pool.query(`
        INSERT INTO construction_fund (id, total_amount, description, updated_at)
        VALUES (1, $1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE 
            SET total_amount = EXCLUDED.total_amount,
                description = EXCLUDED.description,
                updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `, [total_amount, description]);
    return rows[0];
};

// ─── CATEGORÍAS ───────────────────────────────────────────────────────────────

const findAllCategories = async () => {
    const { rows } = await pool.query(`
        SELECT * FROM fund_categories ORDER BY name ASC
    `);
    return rows;
};

const createCategory = async ({ name, color }) => {
    const { rows } = await pool.query(
        `INSERT INTO fund_categories (name, color) VALUES ($1, $2) RETURNING *`,
        [name, color || '#00FF66']
    );
    return rows[0];
};

const updateCategory = async (id, { name, color }) => {
    const result = await pool.query(
        `UPDATE fund_categories SET name = $1, color = $2 WHERE id = $3`,
        [name, color, id]
    );
    return result.rowCount;
};

const deleteCategory = async (id) => {
    const result = await pool.query('DELETE FROM fund_categories WHERE id = $1', [id]);
    return result.rowCount;
};

// ─── MOVIMIENTOS (gastos del fondo) ──────────────────────────────────────────

const findAllMovements = async () => {
    const { rows } = await pool.query(`
        SELECT 
            fm.*,
            fc.name as category_name,
            fc.color as category_color,
            u.name as created_by_name
        FROM fund_movements fm
        LEFT JOIN fund_categories fc ON fm.category_id = fc.id
        LEFT JOIN users u ON fm.created_by_user_id = u.id
        ORDER BY fm.date DESC, fm.created_at DESC
    `);
    return rows;
};

const createMovement = async ({ amount, description, date, category_id, created_by_user_id }) => {
    const { rows } = await pool.query(
        `INSERT INTO fund_movements (amount, description, date, category_id, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [amount, description, date, category_id, created_by_user_id]
    );
    return rows[0].id;
};

const updateMovement = async (id, { amount, description, date, category_id }) => {
    const result = await pool.query(
        `UPDATE fund_movements SET amount = $1, description = $2, date = $3, category_id = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [amount, description, date, category_id, id]
    );
    return result.rowCount;
};

const deleteMovement = async (id) => {
    const result = await pool.query('DELETE FROM fund_movements WHERE id = $1', [id]);
    return result.rowCount;
};

module.exports = {
    getFund,
    upsertFund,
    findAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    findAllMovements,
    createMovement,
    updateMovement,
    deleteMovement,
};
