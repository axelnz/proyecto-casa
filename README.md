# Proyecto Casa - Gestión Financiera Familiar 🏠💰

![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vue.js&logoColor=4FC08D)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

Sistema web *Full Stack* para el control exhaustivo de gastos familiares, presupuesto colaborativo y seguimiento mensual. Diseñado con una arquitectura moderna y una interfaz minimalista, orientada a la eficiencia y usabilidad.

---

## 🚀 Características Principales

- **Dashboard Interactivo**: Resumen mensual financiero, progreso de aportes por integrante y control del presupuesto total de la casa.
- **Gestión de Gastos y Conceptos**: Registro de egresos con asignación de responsables y categorización dinámica por conceptos.
- **Autenticación y Roles**: Sistema de login seguro basado en **JWT** (JSON Web Tokens), con gestión de usuarios y roles (Administrador / Familiar).
- **Módulo de Préstamos**: Seguimiento avanzado de préstamos internos y saldos pendientes.
- **Aesthetics & UI/UX**: Interfaz responsiva, moderna y oscura (Dark Mode) con micro-animaciones y acentos en color lima, priorizando la legibilidad de datos financieros.

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Vue 3 (Composition API)
- **Tooling**: Vite
- **State Management**: Pinia
- **Routing**: Vue Router
- **HTTP Client**: Axios (con interceptores JWT)

### Backend
- **Entorno**: Node.js
- **Framework**: Express.js
- **Base de Datos**: PostgreSQL (Supabase)
- **Seguridad**: Helmet, Express Rate Limit, bcrypt

---

## 📁 Estructura del Proyecto

El repositorio está dividido en dos espacios de trabajo principales:

- `/backend`: Servidor Express, modelos, controladores y lógica de negocio de la API REST.
- `/frontend`: Aplicación *Single Page Application* (SPA) desarrollada con Vue 3.

---

## ⚙️ Configuración y Despliegue Local

### 1. Requisitos previos
- **Node.js** (v18 o superior)
- **PostgreSQL** (Local o cuenta en Supabase)

### 2. Base de Datos
1. Crea una base de datos PostgreSQL (ej. `proyecto_casa_db`).
2. Ejecuta el script de inicialización ubicado en `backend/src/db/schema_postgres.sql` para generar las tablas requeridas.

### 3. Variables de Entorno
Copia los archivos `.env.example` y renómbralos a `.env` en sus respectivas carpetas:

**`backend/.env`**:
```env
PORT=3000
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=tu_secreto_seguro
```

**`frontend/.env`** *(Opcional)*:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 4. Instalación y Ejecución

Desde la raíz del proyecto, puedes instalar todas las dependencias e iniciar los servidores:

```bash
# Instalar todas las dependencias (Root, Backend y Frontend)
npm run install:all

# Levantar Backend (Puerto 3000 por defecto)
npm run dev:backend

# Levantar Frontend (Puerto 5173 por defecto)
npm run dev:frontend
```

---

## 🔐 Seguridad y Buenas Prácticas

Este proyecto implementa múltiples capas de seguridad para proteger los datos financieros:

- **Protección de Cabeceras HTTP**: Utilización de `Helmet` para prevenir vulnerabilidades comunes de la web.
- **Rate Limiting**: Prevención de ataques de fuerza bruta y DDoS limitando el número de peticiones por IP usando `express-rate-limit`.
- **CORS Configurable**: Restricción de orígenes cruzados gestionada por variables de entorno.
- **Criptografía**: Las contraseñas se almacenan mediante hashing robusto con `bcrypt`.
- **Autorización**: Rutas protegidas mediante Middlewares de validación de JWT y verificación de roles a nivel de API y Frontend (Router Guards).

---

## 📝 Estado del Proyecto

### Instalar en el celular

Abrir [Proyecto Casa](https://proyecto-casa-three.vercel.app) y recargar una vez para recibir la versión actual:

- **Android / Chrome:** menú ⋮ → Agregar a la pantalla principal → Instalar.
- **iPhone / Safari:** Compartir → Agregar a pantalla de inicio. Si aparece «Abrir como app web», dejarlo activado.

La app instalada aparece como **Casa**, con un ícono de casa verde, y abre en una ventana propia. Puede pedir iniciar sesión al abrirla por primera vez. Sigue necesitando conexión y mantiene el mismo backend, las mismas cuentas y los mismos datos.

La instalación se configura con `frontend/public/manifest.webmanifest`, íconos PNG de 192/512 px, ícono maskable para Android y `apple-touch-icon` de 180 px para iPhone. Vite copia estos archivos a `dist`; Vercel los sirve públicamente por HTTPS. No requiere migración de Supabase, cambios en Render ni un service worker. Los íconos pueden regenerarse con `python frontend/scripts/generate-icons.py` (Pillow).

Referencia: [requisitos de instalación de aplicaciones web](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

La configuración del botón **Despertar sistema**, sus permisos y el ordenamiento de tablas están documentados en [docs/SYSTEM_WAKE.md](docs/SYSTEM_WAKE.md).

Actualmente el proyecto se encuentra en una versión funcional **MVP (Minimum Viable Product)** con los módulos de Usuarios, Meses, Conceptos, Préstamos, Gastos y Dashboard completamente integrados y en constante evolución de UI/UX.
