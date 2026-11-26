const pool = require("../config/db");

function authorize(permission) {
  return async function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first.",
      });
    }

    try {
      const result = await pool.query(
        `SELECT 1
         FROM users u
         JOIN role_permissions rp ON rp.role_id = u.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE u.id = $1
           AND u.status = 'active'
           AND p.name = $2`,
        [req.user.id, permission],
      );

      if (result.rowCount === 0) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = authorize;
