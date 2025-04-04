const checkAuth = (req, res, next) => {
    console.log('Middleware checkAuth - Session:', req.session);
    console.log('Middleware checkAuth - User:', req.session.user);
    if (req.session && req.session.user) {
      // Vérifier si la session a expiré (uniquement pour les non-admins)
      if (!req.session.user.isAdmin && req.session.user.sessionExpiry) {
        const now = new Date();
        console.log('Temps actuel:', now);
        console.log('Expiration de la session:', req.session.user.sessionExpiry);
        if (new Date(req.session.user.sessionExpiry) < now) {
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
        req.session.save();
      }
      
      return next();
    }
    console.log('Middleware checkAuth - Redirection vers /');
    res.redirect('/');
  };
  
  const checkAdmin = (req, res, next) => {
    console.log('Middleware checkAdmin - Session:', req.session);
    console.log('Middleware checkAdmin - User:', req.session.user);
    
    if (!req.session || !req.session.user) {
      console.log('Middleware checkAdmin - Pas de session');
      return res.status(403).render('error', { message: 'Accès refusé' });
    }

    if (!req.session.user.isAdmin) {
      console.log('Middleware checkAdmin - Utilisateur non admin');
      return res.status(403).render('error', { message: 'Accès refusé' });
    }

    // Rafraîchir explicitement la session admin
    req.session.touch();
    req.session.save((err) => {
      if (err) {
        console.error('Erreur lors de la sauvegarde de la session:', err);
        return res.status(500).render('error', { message: 'Erreur serveur' });
      }
      console.log('Middleware checkAdmin - Accès accordé');
      next();
    });
  };
  
  module.exports = { checkAuth, checkAdmin };
  