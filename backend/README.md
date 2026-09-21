# 🐄 Backend La Estancia - Gestión Ganadera

Backend profesional, escalable y tipado para el sistema de gestión ganadera de La Estancia.

## 🎯 Características

- ✅ **API RESTful completa** con 50+ endpoints
- 🔐 **Autenticación JWT** con roles y permisos
- 🗄️ **ORM Drizzle** con PostgreSQL
- 📝 **Validación** con Zod en todos los endpoints
- 📊 **Dashboard KPIs** en tiempo real
- 📈 **Reportes financieros** y análisis
- 🐄 **Gestión completa de bovinos**
- 💉 **Control de sanidad y salud**
- 👶 **Seguimiento reproductivo**
- 💰 **Análisis financiero** por lote
- 📚 **Documentación Swagger/OpenAPI**
- 🧪 **Testing** con Vitest
- ⚡ **Performance optimizado**

## 🛠️ Stack Técnico

- **Runtime**: Node.js 20+
- **Framework**: Hono (TypeScript)
- **ORM**: Drizzle ORM
- **BD**: PostgreSQL
- **Validación**: Zod
- **Autenticación**: JWT + bcrypt
- **Logger**: Pino
- **Testing**: Vitest

## 📋 Requisitos Previos

- Node.js 20+
- PostgreSQL 13+
- npm o yarn

## 🚀 Instalación

### 1. Clonar y instalar

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus valores:

```env
DATABASE_URL="postgresql://estancia_admin:AdminDB2026!@localhost:5432/laestancia_guayaba"
JWT_SECRET="tu_secret_super_seguro_2026"
PORT=3000
NODE_ENV="development"
LOG_LEVEL="info"
FRONTEND_URL="http://localhost:5173"
```

### 3. Ejecutar migraciones

```bash
npm run migrate:push
```

### 4. Seed de datos de prueba

```bash
npm run seed
```

### 5. Iniciar servidor

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

## 📚 Documentación

### Swagger/OpenAPI

Accede a la documentación interactiva en:

```
http://localhost:3000/api/docs
```

## 🔑 Credenciales de Prueba

Después de ejecutar `npm run seed`:

- **Email**: `admin@laestancia.com`
- **Password**: `AdminPass123!`
- **Rol**: `admin`

### Otros usuarios:

- `gestor@laestancia.com` (rol: gestor)
- `vet@laestancia.com` (rol: veterinario)

## 📡 Endpoints Principales

### 🔐 Autenticación

```
POST   /api/auth/login           Login
POST   /api/auth/logout          Logout
GET    /api/auth/me              Datos del usuario
```

### 🐄 Bovinos

```
GET    /api/bovinos              Lista con paginación y filtros
GET    /api/bovinos/:id          Detalle con relaciones
GET    /api/bovinos/search       Búsqueda rápida
POST   /api/bovinos              Crear
PUT    /api/bovinos/:id          Actualizar
DELETE /api/bovinos/:id          Eliminar (solo admin)
```

### 💉 Salud

```
GET    /api/salud                Eventos con filtros
GET    /api/salud/upcoming       Próximos eventos (7 días)
GET    /api/salud/animal/:id     Historial completo
POST   /api/salud                Crear evento
PUT    /api/salud/:id            Actualizar
DELETE /api/salud/:id            Eliminar
```

### 👶 Reproducción

```
GET    /api/reproduccion         Inseminaciones
GET    /api/reproduccion/partos/proximos  Partos próximos (30 días)
POST   /api/reproduccion         Registrar inseminación
PUT    /api/reproduccion/:id     Actualizar gestación
DELETE /api/reproduccion/:id     Eliminar
```

### 💰 Finanzas

```
GET    /api/finanzas             KPIs generales
GET    /api/finanzas/lotes       Desglose por lote
GET    /api/finanzas/historico   Histórico mensual
POST   /api/finanzas             Registrar ingreso/egreso
PUT    /api/finanzas/:id         Actualizar
DELETE /api/finanzas/:id         Eliminar
```

### 📊 Dashboard

```
GET    /api/dashboard/kpis               KPIs principales
GET    /api/dashboard/graficos           Datos para gráficos
GET    /api/dashboard/tareas-proximas    Tareas sanitarias
GET    /api/dashboard/partos-proximos    Partos estimados
```

## 🏗️ Estructura del Proyecto

```
src/
├── db/
│   ├── schema.ts         # Modelos Drizzle ORM
│   ├── index.ts          # Conexión BD
│   └── seed.ts           # Datos iniciales
├── modules/
│   ├── auth/
│   │   └── routes.ts     # Rutas de autenticación
│   ├── bovinos/
│   │   └── routes.ts     # CRUD de bovinos
│   ├── salud/
│   │   └── routes.ts     # Gestión de salud
│   ├── reproduccion/
│   │   └── routes.ts     # Control reproductivo
│   ├── finanzas/
│   │   └── routes.ts     # Análisis financiero
│   └── dashboard/
│       └── routes.ts     # KPIs y gráficos
├── middleware/
│   └── index.ts          # Auth, CORS, logging
├── lib/
│   ├── jwt.ts            # Manejo de tokens
│   ├── schemas.ts        # Validación Zod
│   ├── errors.ts         # Error handling
│   └── swagger.ts        # OpenAPI docs
├── utils/
│   └── logger.ts         # Pino logger
└── index.ts              # Entry point
```

## 🔐 Autenticación

### Flow JWT

1. **Login**: POST `/api/auth/login` con email/password
2. **Token**: Recibir JWT de 24h
3. **Requests**: Enviar token en header `Authorization: Bearer <token>`
4. **Logout**: POST `/api/auth/logout`

### Roles y Permisos

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `admin` | Administrador | Todo acceso, puede eliminar |
| `gestor` | Gestor | CRUD completo (sin eliminar) |
| `veterinario` | Veterinario | Salud y reproducción |
| `viewer` | Espectador | Solo lectura |

## 📝 Validaciones

Todos los endpoints validan inputs con Zod:

```typescript
// Ejemplo: Crear bovino
{
  "chip": "BO-001",
  "nombre": "Imperador",
  "raza": "Nelore",
  "sexo": "M",
  "nacimiento": "2021-03-12",
  "pesoInicial": 32,
  "pesoActual": 780,
  "potrero": "Norte-A"
}
```

## 📊 Respuestas Estándar

### Éxito

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "message": "Descripción del error",
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Con cobertura
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## 📦 Scripts Disponibles

```bash
npm run dev          # Desarrollo con hot-reload
npm run build        # Compilar TypeScript
npm start            # Ejecutar versión compilada
npm run migrate      # Generar migraciones
npm run migrate:push # Aplicar migraciones
npm run seed         # Seed de datos
npm run lint         # Verificar ESLint
npm run format       # Formatear con Prettier
npm test             # Ejecutar tests
```

## 🚨 Error Codes

| Código | HTTP | Descripción |
|--------|------|-------------|
| `UNAUTHORIZED` | 401 | No autenticado |
| `FORBIDDEN` | 403 | Permiso denegado |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `DUPLICATE_CHIP` | 400 | Chip ya existe |
| `DUPLICATE_RECORD` | 400 | Registro duplicado |
| `VALIDATION_ERROR` | 400 | Validación fallida |
| `INTERNAL_ERROR` | 500 | Error del servidor |

## 🔒 Seguridad

- ✅ CORS configurado
- ✅ Rate limiting
- ✅ JWT con expiración (24h)
- ✅ Contraseñas hasheadas (bcrypt)
- ✅ Validación de inputs (Zod)
- ✅ SQL injection previsto (ORM)
- ✅ Headers de seguridad (Helmet)
- ✅ Auditoría de cambios

## 📈 Performance

- Índices en BD para búsquedas rápidas
- Paginación por defecto
- Caché en frontend (TanStack Query)
- Conexión pooling en PostgreSQL
- Lazy loading de relaciones

## 🤝 Integración Frontend

El frontend React 19 consume esta API con TanStack Query:

```typescript
// Ejemplo
const { data } = useQuery({
  queryKey: ["bovinos"],
  queryFn: () =>
    fetch(`/api/bovinos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((r) => r.json()),
});
```

## 📝 Logs

Los logs se guardan con niveles:

```
debug   - Información de debugging
info    - Eventos importantes
warn    - Advertencias
error   - Errores
```

En desarrollo se muestran con colores. En producción son JSON.

## 🐛 Troubleshooting

### "Error: DATABASE_URL no configurado"

Asegúrate de copiar `.env.example` a `.env` y configurar la BD.

### "Error: Connection refused"

Verifica que PostgreSQL esté corriendo:

```bash
# Linux/Mac
pg_isready -h localhost

# Windows
"C:\Program Files\PostgreSQL\15\bin\pg_isready.exe" -h localhost
```

### "Error: JWT_SECRET no configurado"

Define `JWT_SECRET` en `.env`.

## 📞 Soporte

Para reportar problemas o sugerencias:
- Email: `admin@laestancia.com`
- Documentación: Ver `/api/docs`

## 📄 Licencia

MIT

---

**Hecho con ❤️ para La Estancia Guayaba**
