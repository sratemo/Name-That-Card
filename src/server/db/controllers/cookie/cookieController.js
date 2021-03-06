module.exports = {
  // Clear Cookie - Removes Authorization
  deleteSSIDCookie: (req, res, next) => {
    res.clearCookie('ssid');
    next();
  },

  setSSIDCookie: (req, res, next) => {
    // Cookie accessible via HTTP only and expires after 24 hours
    res.cookie('ssid', res.locals.ssid, { httpOnly: true });
    next();
  },

  // Clear Cookie - Removes Authorization
  deleteAdminCookie: (req, res, next) => {
    res.clearCookie('admin');
    next();
  },

  setAdminCookie: (req, res, next) => {
    // Cookie accessible via HTTP only and expires after 24 hours
    res.cookie('admin', res.locals.admin, { httpOnly: true });
    next();
  },
};
