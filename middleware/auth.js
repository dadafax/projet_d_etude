
const checkAuth = (req, res, next) => {
    if (req.session.user) {
      // Vérifier si la session a expiré
      const now = new Date();
      if (req.session.user.sessionExpiry && new Date(req.session.user.sessionExpiry) < now) {
        req.session.destroy();
        return res.redirect('/?expired=true');
      }
      
      // Vérifier si l'utilisateur est blacklisté
      if (req.session.user.blacklisted) {
        req.session.destroy();
        return res.redirect('/?blacklisted=true');
      }
      
      return next();
    }
    res.redirect('/');
  };
  
  const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.isAdmin) {
      return next();
    }
    res.status(403).render('error', { message: 'Accès refusé' });
  };
  
  module.exports = { checkAuth, checkAdmin };
  