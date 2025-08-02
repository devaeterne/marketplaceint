export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || "http://localhost:5050",
  BOT_URL: process.env.REACT_APP_BOT_URL || "http://localhost:8000",
  ENDPOINTS: {
    PRODUCTS: "/api/products",
    BOTS: "/api/bots",
    ANALYTICS: "/api/analytics",
    AUTH: "/api/auth",
  },
};
