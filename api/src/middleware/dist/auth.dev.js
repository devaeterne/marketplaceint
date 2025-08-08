"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.requireRole = exports.authenticateToken = void 0;

var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var JWT_SECRET = process.env.JWT_SECRET || "a-string-secret-at-least-256-bits-long";

var authenticateToken = function authenticateToken(req, res, next) {
  var authHeader = req.headers["authorization"];
  var token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  console.log("🔍 Auth header:", authHeader ? "Present" : "Missing");
  console.log("🔍 Token extracted:", token ? "Yes" : "No");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required"
    });
  }

  _jsonwebtoken["default"].verify(token, process.env.JWT_SECRET, function (err, decoded) {
    if (err) {
      console.error("❌ Token verification failed:", err.message);
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token",
        error: err.message
      });
    }

    console.log("🔍 Token decoded successfully:", decoded);
    console.log("🔍 Available fields in token:", Object.keys(decoded));
    req.user = decoded; // Decoded token payload'ını req'e ekle

    next();
  });
};

exports.authenticateToken = authenticateToken;

var requireRole = function requireRole(roles) {
  return function (req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Yetkiniz bulunmuyor"
      });
    }

    next();
  };
};

exports.requireRole = requireRole;