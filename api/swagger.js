import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Marketplace Bot API",
      version: "1.0.0",
      description: "API documentation for Marketplace Bot",
    },
    servers: [
      {
        url: "http://localhost:5050",
        description: "Development server",
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
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Dosya yollarını düzelt
  apis: [
    path.join(__dirname, "./src/routes/*.js"),
    path.join(__dirname, "./routes/*.js"), // Her iki durumu da kontrol et
  ],
};

const swaggerSpec = swaggerJSDoc(options);

// Debug için Swagger spec'i kontrol et
console.log("📚 Swagger Paths Found:", Object.keys(swaggerSpec.paths || {}));
console.log("📚 Total Paths:", Object.keys(swaggerSpec.paths || {}).length);

export default function setupSwagger(app) {
  // Swagger JSON endpoint'i ekle (debug için)
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  console.log("📚 Swagger UI available at: http://localhost:5050/api-docs");
  console.log(
    "📚 Swagger JSON available at: http://localhost:5050/api-docs.json"
  );
}

export { swaggerSpec };
