<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/authStore';
import MoneyInput from '../components/MoneyInput.vue';
import api from '../api/axios';

const authStore = useAuthStore();

// ─── Estado ───────────────────────────────────────────────────────────────────
const fund = ref({ total_amount: 0, description: '' });
const categories = ref([]);
const movements = ref([]);
const loading = ref(true);
const error = ref('');

// Modal estados
const showMovementModal = ref(false);
const showCategoryModal = ref(false);
const showFundModal = ref(false);
const showDeleteConfirm = ref(false);
const editingMovement = ref(null);
const editingCategory = ref(null);
const deletingItem = ref(null);
const deleteType = ref('');
const activeTab = ref('movements'); // 'movements' | 'categories'

// Formulario movimiento
const movementForm = ref({
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  category_id: '',
});

// Formulario categoría
const categoryForm = ref({ name: '', color: '#3B82F6' });

// Formulario fondo
const fundForm = ref({ total_amount: '', description: '' });

// ─── Computed ─────────────────────────────────────────────────────────────────
const totalSpent = computed(() =>
  movements.value.reduce((acc, m) => acc + parseFloat(m.amount || 0), 0)
);
const totalAvailable = computed(() =>
  parseFloat(fund.value.total_amount || 0) - totalSpent.value
);
const usagePercent = computed(() => {
  const total = parseFloat(fund.value.total_amount || 0);
  if (total === 0) return 0;
  return Math.min(100, (totalSpent.value / total) * 100);
});

const spentByCategory = computed(() => {
  const map = {};
  movements.value.forEach(m => {
    const key = m.category_id || 'sin-categoria';
    const label = m.category_name || 'Sin categoría';
    const color = m.category_color || '#6B7280';
    if (!map[key]) map[key] = { name: label, color, total: 0 };
    map[key].total += parseFloat(m.amount || 0);
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
});

const movementsFiltered = computed(() => {
  if (!filterCategory.value) return movements.value;
  return movements.value.filter(m => m.category_id == filterCategory.value);
});

const filterCategory = ref('');

const fetchAll = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [fundRes, catsRes, movRes] = await Promise.all([
      api.get('/fund/fund'),
      api.get('/fund/categories'),
      api.get('/fund/movements'),
    ]);
    fund.value = fundRes.data;
    categories.value = catsRes.data;
    movements.value = movRes.data;
  } catch (e) {
    error.value = 'Error al cargar los datos.';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchAll);

// ─── Formatters ───────────────────────────────────────────────────────────────
const formatMoney = (n) => {
  const num = parseFloat(n || 0);
  return '$ ' + num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatDate = (d) => {
  if (!d) return '';

  const dateOnlyMatch = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ─── Fondo ────────────────────────────────────────────────────────────────────
const openFundModal = () => {
  fundForm.value = {
    total_amount: fund.value.total_amount || '',
    description: fund.value.description || '',
  };
  showFundModal.value = true;
};

const saveFund = async () => {
  try {
    await api.put('/fund/fund', {
      total_amount: parseFloat(String(fundForm.value.total_amount).replace(/\./g, '').replace(',', '.')),
      description: fundForm.value.description,
    });
    await fetchAll();
    showFundModal.value = false;
  } catch {
    alert('Error al guardar el fondo.');
  }
};

// ─── Movimientos ──────────────────────────────────────────────────────────────
const openNewMovement = () => {
  editingMovement.value = null;
  movementForm.value = {
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category_id: categories.value[0]?.id || '',
  };
  showMovementModal.value = true;
};

const openEditMovement = (m) => {
  editingMovement.value = m;
  movementForm.value = {
    amount: m.amount,
    description: m.description,
    date: m.date?.split('T')[0] || m.date,
    category_id: m.category_id || '',
  };
  showMovementModal.value = true;
};

const saveMovement = async () => {
  const rawAmount = String(movementForm.value.amount).replace(/\./g, '').replace(',', '.');
  const body = {
    ...movementForm.value,
    amount: parseFloat(rawAmount),
  };

  try {
    const url = editingMovement.value
      ? `/fund/movements/${editingMovement.value.id}`
      : '/fund/movements';
    if (editingMovement.value) {
      await api.put(url, body);
    } else {
      await api.post(url, body);
    }
    await fetchAll();
    showMovementModal.value = false;
  } catch {
    alert('Error al guardar el movimiento.');
  }
};

// ─── Categorías ───────────────────────────────────────────────────────────────
const openNewCategory = () => {
  editingCategory.value = null;
  categoryForm.value = { name: '', color: '#3B82F6' };
  showCategoryModal.value = true;
};

const openEditCategory = (c) => {
  editingCategory.value = c;
  categoryForm.value = { name: c.name, color: c.color };
  showCategoryModal.value = true;
};

const saveCategory = async () => {
  try {
    const url = editingCategory.value
      ? `/fund/categories/${editingCategory.value.id}`
      : '/fund/categories';
    if (editingCategory.value) {
      await api.put(url, categoryForm.value);
    } else {
      await api.post(url, categoryForm.value);
    }
    await fetchAll();
    showCategoryModal.value = false;
  } catch {
    alert('Error al guardar la categoría.');
  }
};

// ─── Eliminar ─────────────────────────────────────────────────────────────────
const confirmDelete = (item, type) => {
  deletingItem.value = item;
  deleteType.value = type;
  showDeleteConfirm.value = true;
};

const executeDelete = async () => {
  try {
    const url = deleteType.value === 'movement'
      ? `/fund/movements/${deletingItem.value.id}`
      : `/fund/categories/${deletingItem.value.id}`;
    await api.delete(url);
    await fetchAll();
    showDeleteConfirm.value = false;
  } catch {
    alert('Error al eliminar.');
  }
};
</script>

<template>
  <div class="fund-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>Caja de Obra</h1>
        <p class="subtitle">Control de saldo para la construcción</p>
      </div>
      <div class="header-actions">
        <button v-if="authStore.isAdmin" class="btn btn-secondary" @click="openFundModal">
          ⚙️ Configurar Fondo
        </button>
        <button v-if="authStore.isAdmin" class="btn btn-primary" @click="openNewMovement">
          + Nuevo Gasto
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando datos...</p>
    </div>

    <div v-else>
      <!-- Tarjetas resumen -->
      <div class="summary-cards">
        <div class="summary-card card-total">
          <div class="card-icon">💰</div>
          <div class="card-info">
            <span class="card-label">Fondo Total</span>
            <span class="card-value">{{ formatMoney(fund.total_amount) }}</span>
          </div>
        </div>
        <div class="summary-card card-spent">
          <div class="card-icon">📤</div>
          <div class="card-info">
            <span class="card-label">Total Gastado</span>
            <span class="card-value negative">{{ formatMoney(totalSpent) }}</span>
          </div>
        </div>
        <div class="summary-card" :class="totalAvailable >= 0 ? 'card-available' : 'card-overbudget'">
          <div class="card-icon">{{ totalAvailable >= 0 ? '✅' : '⚠️' }}</div>
          <div class="card-info">
            <span class="card-label">Disponible</span>
            <span class="card-value" :class="totalAvailable >= 0 ? 'positive' : 'negative'">
              {{ formatMoney(totalAvailable) }}
            </span>
          </div>
        </div>
        <div class="summary-card card-count">
          <div class="card-icon">📋</div>
          <div class="card-info">
            <span class="card-label">Registros</span>
            <span class="card-value">{{ movements.length }}</span>
          </div>
        </div>
      </div>

      <!-- Barra de progreso -->
      <div class="progress-section">
        <div class="progress-header">
          <span>Uso del fondo</span>
          <span class="progress-pct">{{ usagePercent.toFixed(1) }}%</span>
        </div>
        <div class="progress-bar-bg">
          <div
            class="progress-bar-fill"
            :style="{ width: usagePercent + '%' }"
            :class="usagePercent > 90 ? 'danger' : usagePercent > 70 ? 'warning' : 'ok'"
          ></div>
        </div>
      </div>

      <!-- Tabs: Movimientos / Categorías -->
      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'movements' }"
          @click="activeTab = 'movements'"
        >Historial de Gastos</button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'categories' }"
          @click="activeTab = 'categories'"
        >Categorías</button>
      </div>

      <!-- MOVIMIENTOS -->
      <div v-if="activeTab === 'movements'">
        <!-- Filtro -->
        <div class="filter-bar">
          <select v-model="filterCategory" class="form-select">
            <option value="">Todas las categorías</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div v-if="movementsFiltered.length === 0" class="empty-state">
          <div class="empty-icon">🏗️</div>
          <p>Todavía no hay gastos registrados.</p>
          <button v-if="authStore.isAdmin" class="btn btn-primary" @click="openNewMovement">+ Registrar primer gasto</button>
        </div>

        <div v-else class="movements-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th class="text-right">Importe</th>
                <th v-if="authStore.isAdmin" class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in movementsFiltered" :key="m.id">
                <td class="date-cell">{{ formatDate(m.date) }}</td>
                <td class="desc-cell">{{ m.description }}</td>
                <td>
                  <span
                    v-if="m.category_name"
                    class="category-badge"
                    :style="{ background: m.category_color + '22', color: m.category_color, borderColor: m.category_color + '55' }"
                  >{{ m.category_name }}</span>
                  <span v-else class="category-badge no-cat">Sin categoría</span>
                </td>
                <td class="text-right amount-cell">{{ formatMoney(m.amount) }}</td>
                <td v-if="authStore.isAdmin" class="text-center actions-cell">
                  <button class="action-btn edit" @click="openEditMovement(m)" title="Editar">✏️</button>
                  <button class="action-btn delete" @click="confirmDelete(m, 'movement')" title="Eliminar">🗑️</button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="total-label">Total gastado</td>
                <td class="text-right total-value">{{ formatMoney(totalSpent) }}</td>
                <td v-if="authStore.isAdmin"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- CATEGORÍAS -->
      <div v-if="activeTab === 'categories'">
        <div class="categories-header">
          <button v-if="authStore.isAdmin" class="btn btn-secondary" @click="openNewCategory">+ Nueva Categoría</button>
        </div>
        <div class="categories-grid">
          <div v-for="c in categories" :key="c.id" class="category-card">
            <div class="category-swatch" :style="{ background: c.color }"></div>
            <div class="category-card-info">
              <span class="category-card-name">{{ c.name }}</span>
              <span class="category-card-spent">
                {{ formatMoney(spentByCategory.find(s => s.name === c.name)?.total || 0) }}
              </span>
            </div>
            <div v-if="authStore.isAdmin" class="category-card-actions">
              <button class="action-btn edit" @click="openEditCategory(c)">✏️</button>
              <button class="action-btn delete" @click="confirmDelete(c, 'category')">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Gastos por categoría -->
      <div v-if="spentByCategory.length" class="category-breakdown">
        <h3>Por categoría</h3>
        <div class="category-bars">
          <div v-for="cat in spentByCategory" :key="cat.name" class="cat-row">
            <div class="cat-info">
              <span class="cat-dot" :style="{ background: cat.color }"></span>
              <span class="cat-name">{{ cat.name }}</span>
            </div>
            <div class="cat-bar-wrap">
              <div
                class="cat-bar"
                :style="{
                  width: totalSpent > 0 ? (cat.total / totalSpent * 100) + '%' : '0%',
                  background: cat.color
                }"
              ></div>
            </div>
            <span class="cat-amount">{{ formatMoney(cat.total) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL: Configurar Fondo ═══ -->
    <div v-if="showFundModal" class="modal-overlay" @click.self="showFundModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>⚙️ Configurar Fondo</h2>
          <button class="modal-close" @click="showFundModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Monto total del fondo</label>
            <MoneyInput v-model="fundForm.total_amount" placeholder="$ 0" />
          </div>
          <div class="form-group">
            <label>Descripción (opcional)</label>
            <input v-model="fundForm.description" type="text" class="form-input" placeholder="Ej: Préstamos Banco X + Banco Y" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showFundModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="saveFund">Guardar</button>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL: Movimiento ═══ -->
    <div v-if="showMovementModal" class="modal-overlay" @click.self="showMovementModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingMovement ? '✏️ Editar Gasto' : '+ Nuevo Gasto' }}</h2>
          <button class="modal-close" @click="showMovementModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Importe *</label>
            <MoneyInput v-model="movementForm.amount" placeholder="$ 0" />
          </div>
          <div class="form-group">
            <label>Descripción *</label>
            <input v-model="movementForm.description" type="text" class="form-input" placeholder="Ej: Cemento para losa" maxlength="500" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Fecha *</label>
              <input v-model="movementForm.date" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label>Categoría</label>
              <select v-model="movementForm.category_id" class="form-select">
                <option value="">Sin categoría</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showMovementModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="saveMovement">
            {{ editingMovement ? 'Guardar cambios' : 'Registrar gasto' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL: Categoría ═══ -->
    <div v-if="showCategoryModal" class="modal-overlay" @click.self="showCategoryModal = false">
      <div class="modal-content modal-small">
        <div class="modal-header">
          <h2>{{ editingCategory ? 'Editar categoría' : 'Nueva categoría' }}</h2>
          <button class="modal-close" @click="showCategoryModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nombre *</label>
            <input v-model="categoryForm.name" type="text" class="form-input" placeholder="Ej: Materiales" />
          </div>
          <div class="form-group">
            <label>Color</label>
            <div class="color-picker-row">
              <input v-model="categoryForm.color" type="color" class="color-input" />
              <span class="color-preview" :style="{ background: categoryForm.color }">{{ categoryForm.name || 'Ejemplo' }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showCategoryModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="saveCategory">Guardar</button>
        </div>
      </div>
    </div>

    <!-- ═══ MODAL: Confirmar Eliminar ═══ -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal-content modal-small">
        <div class="modal-header">
          <h2>🗑️ Confirmar eliminación</h2>
          <button class="modal-close" @click="showDeleteConfirm = false">✕</button>
        </div>
        <div class="modal-body">
          <p>¿Estás seguro que querés eliminar este {{ deleteType === 'movement' ? 'gasto' : 'categoría' }}?</p>
          <p v-if="deletingItem" class="delete-detail">
            <strong>{{ deletingItem.description || deletingItem.name }}</strong>
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showDeleteConfirm = false">Cancelar</button>
          <button class="btn btn-danger" @click="executeDelete">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fund-view {
  max-width: 1100px;
}

/* ─── Header ─── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}
.page-header h1 {
  font-size: 1.6rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 0.2rem;
}
.subtitle {
  color: #7E8286;
  font-size: 0.875rem;
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* ─── Buttons ─── */
.btn {
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}
.btn-primary { background: #00FF66; color: #111; }
.btn-primary:hover { background: #00e05a; transform: translateY(-1px); }
.btn-secondary { background: #24272A; color: #fff; border: 1px solid #333; }
.btn-secondary:hover { background: #2e3235; }
.btn-ghost { background: transparent; color: #7E8286; border: 1px solid #333; }
.btn-ghost:hover { background: #1e2124; color: #fff; }
.btn-danger { background: #FF4A4A; color: #fff; }
.btn-danger:hover { background: #e03c3c; }

/* ─── Loading ─── */
.loading-state { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem; color: #7E8286; }
.spinner { width: 36px; height: 36px; border: 3px solid #333; border-top-color: #00FF66; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Summary Cards ─── */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.summary-card {
  background: #1A1C1D;
  border: 1px solid #2a2d30;
  border-radius: 12px;
  padding: 1.2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s;
}
.summary-card:hover { transform: translateY(-2px); }
.card-total { border-left: 3px solid #3B82F6; }
.card-spent { border-left: 3px solid #F59E0B; }
.card-available { border-left: 3px solid #00FF66; }
.card-overbudget { border-left: 3px solid #FF4A4A; }
.card-count { border-left: 3px solid #8B5CF6; }
.card-icon { font-size: 1.5rem; }
.card-info { display: flex; flex-direction: column; }
.card-label { font-size: 0.75rem; color: #7E8286; font-weight: 500; margin-bottom: 0.2rem; }
.card-value { font-size: 1.1rem; font-weight: 700; color: #fff; }
.card-value.positive { color: #00FF66; }
.card-value.negative { color: #FF4A4A; }

/* ─── Progress ─── */
.progress-section {
  background: #1A1C1D;
  border: 1px solid #2a2d30;
  border-radius: 12px;
  padding: 1.2rem 1.5rem;
  margin-bottom: 1.5rem;
}
.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #7E8286;
  margin-bottom: 0.6rem;
}
.progress-pct { font-weight: 700; color: #fff; }
.progress-bar-bg { background: #2a2d30; border-radius: 99px; height: 10px; overflow: hidden; }
.progress-bar-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
.progress-bar-fill.ok { background: linear-gradient(90deg, #00FF66, #00CC55); }
.progress-bar-fill.warning { background: linear-gradient(90deg, #F59E0B, #F97316); }
.progress-bar-fill.danger { background: linear-gradient(90deg, #FF4A4A, #DC2626); }

/* ─── Category Breakdown ─── */
.category-breakdown {
  background: #1A1C1D;
  border: 1px solid #2a2d30;
  border-radius: 12px;
  padding: 1.2rem 1.5rem;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}
.category-breakdown h3 { font-size: 0.9rem; color: #7E8286; font-weight: 600; margin: 0 0 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
.category-bars { display: flex; flex-direction: column; gap: 0.6rem; }
.cat-row { display: grid; grid-template-columns: 160px 1fr 140px; align-items: center; gap: 1rem; }
.cat-info { display: flex; align-items: center; gap: 0.5rem; }
.cat-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.cat-name { font-size: 0.85rem; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cat-bar-wrap { background: #2a2d30; border-radius: 99px; height: 8px; overflow: hidden; }
.cat-bar { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
.cat-amount { text-align: right; font-size: 0.85rem; color: #fff; font-weight: 600; }

/* ─── Tabs ─── */
.tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid #2a2d30; padding-bottom: 0; }
.tab-btn {
  background: none;
  border: none;
  color: #7E8286;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.6rem 1rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
}
.tab-btn.active { color: #00FF66; border-bottom-color: #00FF66; }
.tab-btn:hover:not(.active) { color: #fff; }

/* ─── Filter ─── */
.filter-bar { margin-bottom: 1rem; }
.form-select {
  background: #1A1C1D;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  min-width: 220px;
}

/* ─── Table ─── */
.movements-table-wrap { overflow-x: auto; }
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.data-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  color: #7E8286;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #2a2d30;
}
.data-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #1e2124;
  color: #ccc;
  vertical-align: middle;
}
.data-table tbody tr:hover td { background: #1e2124; }
.data-table tfoot td {
  padding: 0.85rem 1rem;
  border-top: 2px solid #333;
  border-bottom: none;
}
.date-cell { color: #7E8286; white-space: nowrap; }
.desc-cell { max-width: 300px; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.amount-cell { font-weight: 700; color: #fff; white-space: nowrap; }
.total-label { color: #7E8286; font-weight: 600; }
.total-value { color: #FF4A4A; font-weight: 700; font-size: 1rem; }

/* ─── Badges ─── */
.category-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid;
  white-space: nowrap;
}
.no-cat { background: #2a2d30; color: #7E8286; border-color: #333; }

/* ─── Action Buttons ─── */
.actions-cell { white-space: nowrap; }
.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.3rem 0.4rem;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: background 0.15s;
}
.action-btn.edit:hover { background: rgba(59, 130, 246, 0.15); }
.action-btn.delete:hover { background: rgba(255, 74, 74, 0.15); }

/* ─── Empty ─── */
.empty-state { text-align: center; padding: 3rem 1rem; color: #7E8286; }
.empty-icon { font-size: 3rem; margin-bottom: 0.75rem; }
.empty-state p { margin-bottom: 1rem; }

/* ─── Categories Grid ─── */
.categories-header { display: flex; justify-content: flex-end; margin-bottom: 1rem; }
.categories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; }
.category-card {
  background: #1A1C1D;
  border: 1px solid #2a2d30;
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: transform 0.15s;
}
.category-card:hover { transform: translateY(-2px); }
.category-swatch { width: 14px; height: 14px; border-radius: 4px; flex-shrink: 0; }
.category-card-info { flex: 1; min-width: 0; }
.category-card-name { display: block; font-weight: 600; color: #fff; font-size: 0.875rem; }
.category-card-spent { display: block; font-size: 0.75rem; color: #7E8286; }
.category-card-actions { display: flex; gap: 0.25rem; }

/* ─── Modals ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.modal-content {
  background: #1A1C1D;
  border: 1px solid #333;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 88vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.modal-small { max-width: 380px; }
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #2a2d30;
}
.modal-header h2 { font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0; }
.modal-close { background: none; border: none; color: #7E8286; font-size: 1.1rem; cursor: pointer; padding: 0.25rem; }
.modal-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #2a2d30;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  position: sticky;
  bottom: 0;
  background: #1A1C1D;
}

/* ─── Form ─── */
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group label { font-size: 0.8rem; font-weight: 600; color: #7E8286; text-transform: uppercase; letter-spacing: 0.05em; }
.form-input {
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  padding: 0.6rem 0.85rem;
  font-size: 0.9rem;
  width: 100%;
  box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: #00FF66; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

/* ─── Color Picker ─── */
.color-picker-row { display: flex; align-items: center; gap: 1rem; }
.color-input { width: 50px; height: 38px; border: none; border-radius: 6px; cursor: pointer; padding: 2px; }
.color-preview {
  padding: 0.3rem 0.8rem;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #111;
}

/* ─── Delete confirm ─── */
.delete-detail { color: #fff; font-size: 0.95rem; background: #111; border-radius: 8px; padding: 0.75rem 1rem; }

/* ─── Mobile ─── */
@media (max-width: 640px) {
  .cat-row { grid-template-columns: 130px 1fr 100px; }
  .form-row { grid-template-columns: 1fr; }
  .header-actions { width: 100%; justify-content: flex-end; }
}
</style>
