export const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "API La Estancia - Gestión Ganadera",
    version: "1.0.0",
    description:
      "API completa para gestión de bovinos, sanidad, reproducción y finanzas",
    contact: {
      name: "Guayaba Lorente",
      email: "admin@laestancia.com",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Servidor de desarrollo",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Bovino: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          chip: { type: "string", example: "BO-7710-001" },
          nombre: { type: "string", example: "Imperador" },
          raza: { type: "string", example: "Nelore PO" },
          sexo: { type: "string", enum: ["M", "H"] },
          nacimiento: { type: "string", format: "date-time" },
          pesoInicial: { type: "number", example: 32 },
          pesoActual: { type: "number", example: 780 },
          potrero: { type: "string", example: "Norte-A" },
          estado: { type: "string", enum: ["disponible", "preñez", "cuarentena", "vendido", "fallecido"] },
          precio: { type: "number", example: 4200, nullable: true },
          foto: { type: "string", nullable: true },
          notas: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              message: { type: "string" },
              code: { type: "string" },
              details: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login de usuario",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", example: "admin@laestancia.com" },
                  password: { type: "string", example: "AdminPass123!" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login exitoso, retorna token" },
          401: { description: "Credenciales incorrectas" },
        },
      },
    },
    "/api/bovinos": {
      get: {
        tags: ["Bovinos"],
        summary: "Listar bovinos (paginado con filtros)",
        description: "Obtiene lista paginada. Filtros: estado, potrero, q (búsqueda textual)",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "estado", in: "query", schema: { type: "string" } },
          { name: "potrero", in: "query", schema: { type: "string" } },
          { name: "q", in: "query", schema: { type: "string" } },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Lista paginada con meta (page, limit, total, pages)" },
          400: { description: "Parámetros inválidos" },
          401: { description: "No autorizado" },
        },
      },
      post: {
        tags: ["Bovinos"],
        summary: "Crear bovino",
        description: "Crea un bovino. Requiere admin o gestor. Chip debe ser único.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["chip", "nombre", "raza", "sexo", "nacimiento", "pesoInicial", "pesoActual", "potrero"],
                properties: {
                  chip: { type: "string", minLength: 3, example: "BO-TEST-001" },
                  nombre: { type: "string", minLength: 2, example: "Toro Test" },
                  raza: { type: "string", example: "Nelore" },
                  sexo: { type: "string", enum: ["M", "H"] },
                  nacimiento: { type: "string", format: "date", example: "2024-01-15" },
                  pesoInicial: { type: "number", minimum: 1, example: 30 },
                  pesoActual: { type: "number", minimum: 1, example: 500 },
                  potrero: { type: "string", minLength: 2, example: "Norte-A" },
                  estado: { type: "string", enum: ["disponible", "preñez", "cuarentena", "vendido", "fallecido"], default: "disponible" },
                  precio: { type: "number", minimum: 0, example: 4200 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Bovino creado exitosamente" },
          400: { description: "Error de validación" },
          401: { description: "No autorizado" },
          403: { description: "Permiso denegado" },
          409: { description: "Chip duplicado" },
        },
      },
    },
    "/api/bovinos/search": {
      get: {
        tags: ["Bovinos"],
        summary: "Búsqueda rápida",
        description: "Busca por chip, nombre o raza (límite 10)",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" } },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Resultados de búsqueda" },
          400: { description: "Parámetro q requerido" },
          401: { description: "No autorizado" },
        },
      },
    },
    "/api/bovinos/{id}": {
      get: {
        tags: ["Bovinos"],
        summary: "Detalle de bovino",
        description: "Retorna bovino con eventos de salud y reproducción",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Bovino con relaciones" },
          401: { description: "No autorizado" },
          404: { description: "Bovino no encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
      put: {
        tags: ["Bovinos"],
        summary: "Actualizar bovino",
        description: "Actualización parcial. Requiere admin o gestor.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  chip: { type: "string", example: "BO-TEST-001" },
                  nombre: { type: "string", example: "Toro Actualizado" },
                  pesoActual: { type: "number", example: 600 },
                  estado: { type: "string", enum: ["disponible", "preñez", "cuarentena", "vendido", "fallecido"] },
                  precio: { type: "number", example: 5000 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Bovino actualizado" },
          400: { description: "Error de validación" },
          401: { description: "No autorizado" },
          403: { description: "Permiso denegado" },
          404: { description: "Bovino no encontrado" },
          409: { description: "Chip duplicado" },
        },
      },
      delete: {
        tags: ["Bovinos"],
        summary: "Eliminar bovino (soft delete)",
        description: "Cambia estado a vendido/fallecido. No borra físicamente. Solo admin.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Bovino marcado como vendido" },
          401: { description: "No autorizado" },
          403: { description: "Solo administradores" },
          404: { description: "Bovino no encontrado" },
        },
      },
    },
  },
};
