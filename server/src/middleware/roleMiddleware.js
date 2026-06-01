export function authorize(...roles) {
  const allowedRoles = roles.map((role) => String(role).toUpperCase());
  return (req, res, next) => {
    const userRole = String(req.user?.role || "").toUpperCase();
    if (!req.user || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  };
}
