import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "a-string-secret-at-least-256-bits-long";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  console.log("🔍 Auth header:", authHeader ? "Present" : "Missing");
  console.log("🔍 Token extracted:", token ? "Yes" : "No");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("❌ Token verification failed:", err.message);
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token",
        error: err.message,
      });
    }

    console.log("🔍 Token decoded successfully:", decoded);
    console.log("🔍 Available fields in token:", Object.keys(decoded));

    req.user = decoded; // Decoded token payload'ını req'e ekle
    next();
  });
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Yetkiniz bulunmuyor",
      });
    }
    next();
  };
};
