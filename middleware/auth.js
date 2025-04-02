const checkAuth = (req, res, next) => {
    if (req.session.user) {
      // Vérifier si la session a expiré (uniquement pour les non-admins)
      if (!req.session.user.isAdmin) {
        const now = new Date();
        if (req.session.user.sessionExpiry && new Date(req.session.user.sessionExpiry) < now) {
          req.session.destroy((err) => {
            if (err) {
              console.error('Erreur lors de la destruction de la session:', err);
            }
            return res.redirect('/?expired=true');
          });
          return;
        }
      }
      
      // Vérifier si l'utilisateur est blacklisté
      if (req.session.user.blacklisted) {
        // Supprimer l'utilisateur de global.activeUsers s'il est blacklisté
        if (global.activeUsers && global.activeUsers[req.session.user.id.toString()]) {
          delete global.activeUsers[req.session.user.id.toString()];
        }
        
        // Forcer la destruction de la session
        req.session.destroy((err) => {
          if (err) {
            console.error('Erreur lors de la destruction de la session:', err);
          }
          return res.redirect('/?blacklisted=true');
        });
        return;
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
  