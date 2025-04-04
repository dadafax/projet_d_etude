const checkAuth = (req, res, next) => {
    console.log('Middleware checkAuth - Session:', req.session);
    console.log('Middleware checkAuth - User:', req.session.user);
    if (req.session.user) {
      // Vérifier si la session a expiré (uniquement pour les non-admins)
      if (!req.session.user.isAdmin) {
        const now = new Date();
        console.log('Temps actuel:', now);
        console.log('Expiration de la session:', req.session.user.sessionExpiry);
        if (req.session.user.sessionExpiry && new Date(req.session.user.sessionExpiry) < now) {
          console.log('Session expirée, déconnexion...');
          req.session.destroy((err) => {
            if (err) {
              console.error('Erreur lors de la destruction de la session:', err);
            }
            return res.redirect('/?expired=true');
          });
          return;
        }
      }
      
      // Vérifier si l'utilisateur est blacklisté (sauf pour les admins)
      if (!req.session.user.isAdmin && req.session.user.blacklisted) {
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
      
      // Rafraîchir la session pour les admins
      if (req.session.user.isAdmin) {
        req.session.touch();
      }
      
      return next();
    }
    console.log('Middleware checkAuth - Redirection vers /');
    res.redirect('/');
  };
  
  const checkAdmin = (req, res, next) => {
    console.log('Middleware checkAdmin - Session:', req.session);
    if (req.session.user && req.session.user.isAdmin) {
      // Rafraîchir la session admin
      req.session.touch();
      console.log('Middleware checkAdmin - Accès accordé');
      return next();
    }
    console.log('Middleware checkAdmin - Accès refusé');
    res.status(403).render('error', { message: 'Accès refusé' });
  };
  
  module.exports = { checkAuth, checkAdmin };
  