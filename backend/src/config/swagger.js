const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Dab-Automotive API (Customer, Booking, Pickup & Reminder Modules)",
    version: "1.0.0",
    description:
      "REST API documentation for Customer Profile, Vehicle Vault & Maintenance History, Services, Service Packages, Workshop Bays, Service Bookings, Pickup Requests, and Reminder Agent.",
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local development server",
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
  },
  paths: {
    "/api/customers/me": {
      get: {
        tags: ["Customers"],
        summary: "Get logged-in customer profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Customer profile returned" },
          404: { description: "Customer profile not found" },
        },
      },
      post: {
        tags: ["Customers"],
        summary: "Create customer profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  address: { type: "string", example: "House 12, F-10/3" },
                  city: { type: "string", example: "Islamabad" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Customer profile created" },
          409: { description: "Profile already exists" },
        },
      },
      patch: {
        tags: ["Customers"],
        summary: "Update customer profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  address: { type: "string" },
                  city: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Customer profile updated" },
        },
      },
    },
    "/api/vehicles": {
      get: {
        tags: ["Vehicles"],
        summary: "List customer's active vehicles",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of vehicles" } },
      },
      post: {
        tags: ["Vehicles"],
        summary: "Add a new vehicle",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["make", "model", "year", "plate_no"],
                properties: {
                  make: { type: "string", example: "Toyota" },
                  model: { type: "string", example: "Corolla" },
                  year: { type: "integer", example: 2022 },
                  plate_no: { type: "string", example: "ISB-2214" },
                  fuel_type: { type: "string", example: "Petrol" },
                  mileage: { type: "integer", example: 35000 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Vehicle added" },
          409: { description: "Duplicate plate number" },
        },
      },
    },
    "/api/vehicles/{vehicleId}": {
      patch: {
        tags: ["Vehicles"],
        summary: "Update own vehicle",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "vehicleId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Vehicle updated" } },
      },
      delete: {
        tags: ["Vehicles"],
        summary: "Soft-delete own vehicle (blocked if active bookings exist)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "vehicleId", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Vehicle deleted" },
          400: { description: "Vehicle has active bookings" },
        },
      },
    },
    "/api/vehicles/{vehicleId}/history": {
      get: {
        tags: ["Vehicles"],
        summary: "Get maintenance history for a vehicle (Customer own vehicle or Owner)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "vehicleId", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Vehicle maintenance timeline" },
          404: { description: "Vehicle not found or access denied" },
        },
      },
    },
    "/api/services": {
      get: {
        tags: ["Services"],
        summary: "Get all services",
        responses: { 200: { description: "List of services" } },
      },
      post: {
        tags: ["Services"],
        summary: "Create a service",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "price", "duration"],
                properties: {
                  name: { type: "string", example: "Synthetic Oil Change" },
                  description: { type: "string" },
                  price: { type: "number", example: 4500 },
                  duration: { type: "integer", example: 45 },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Service created" } },
      },
    },
    "/api/services/{id}": {
      get: {
        tags: ["Services"],
        summary: "Get service by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Service details" } },
      },
      patch: {
        tags: ["Services"],
        summary: "Update a service",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Service updated" } },
      },
    },
    "/api/packages": {
      get: {
        tags: ["Packages"],
        summary: "Get all service packages with included services",
        responses: { 200: { description: "List of packages" } },
      },
      post: {
        tags: ["Packages"],
        summary: "Create a service package",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "price", "duration", "serviceIds"],
                properties: {
                  name: { type: "string", example: "Periodic Maintenance Package" },
                  description: { type: "string" },
                  price: { type: "number", example: 8500 },
                  duration: { type: "integer", example: 90 },
                  serviceIds: { type: "array", items: { type: "integer" }, example: [1, 2] },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Package created" } },
      },
    },
    "/api/packages/{id}": {
      get: {
        tags: ["Packages"],
        summary: "Get service package by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Package details" } },
      },
    },
    "/api/bays": {
      get: {
        tags: ["Workshop Bays"],
        summary: "Get all workshop bays",
        responses: { 200: { description: "List of workshop bays" } },
      },
      post: {
        tags: ["Workshop Bays"],
        summary: "Create a workshop bay",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Bay 1" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Workshop bay created" } },
      },
    },
    "/api/bookings/available-slots": {
      get: {
        tags: ["Bookings"],
        summary: "Get available booking time slots for a date and package",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "date", in: "query", required: true, schema: { type: "string", example: "2026-12-01" } },
          { name: "packageId", in: "query", required: true, schema: { type: "integer", example: 1 } },
        ],
        responses: { 200: { description: "Available time slots with open bays" } },
      },
    },
    "/api/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "Get customer's bookings",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of bookings" } },
      },
      post: {
        tags: ["Bookings"],
        summary: "Create a new service booking and schedule reminders",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["vehicleId", "packageId", "startTime"],
                properties: {
                  vehicleId: { type: "integer", example: 1 },
                  packageId: { type: "integer", example: 1 },
                  startTime: { type: "string", format: "date-time", example: "2026-12-01T10:00:00+05:00" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Booking created" } },
      },
    },
    "/api/bookings/{id}": {
      get: {
        tags: ["Bookings"],
        summary: "Get booking by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Booking details" } },
      },
      patch: {
        tags: ["Bookings"],
        summary: "Reschedule booking (blocked after job card creation)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["startTime"],
                properties: {
                  startTime: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Booking rescheduled" } },
      },
      delete: {
        tags: ["Bookings"],
        summary: "Cancel booking and cancel pending reminders",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Booking cancelled" } },
      },
    },
    "/api/pickups/estimate": {
      post: {
        tags: ["Pickups"],
        summary: "Estimate pickup distance and fee before creating a request",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["latitude", "longitude"],
                properties: {
                  latitude: { type: "number", example: 33.6844 },
                  longitude: { type: "number", example: 73.0479 },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Estimated distance in km and fee in PKR" } },
      },
    },
    "/api/pickups": {
      post: {
        tags: ["Pickups"],
        summary: "Create a vehicle pickup request for a booking",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bookingId", "address", "latitude", "longitude"],
                properties: {
                  bookingId: { type: "integer", example: 1 },
                  address: { type: "string", example: "Sector F-8 Markaz, Islamabad" },
                  latitude: { type: "number", example: 33.7104 },
                  longitude: { type: "number", example: 73.0405 },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Pickup request created" } },
      },
    },
  },
};

module.exports = swaggerDocument;