// Gestion des menus et modaux
document.addEventListener('DOMContentLoaded', function() {
    
    // ========== MENU UTILISATEUR (en haut à droite) ==========
    const userButton = document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd097a"]');
    const userMenu = document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0984"]');
    
    if (userButton && userMenu) {
        userButton.addEventListener('click', function(e) {
            e.preventDefault();
            userMenu.style.display = userMenu.style.display === 'none' || userMenu.style.display === '' ? 'block' : 'none';
        });
    }
    
    // Fermer le menu si on clique ailleurs
    document.addEventListener('click', function(e) {
        if (userMenu && userButton && !userButton.contains(e.target) && !userMenu.contains(e.target)) {
            userMenu.style.display = 'none';
        }
    });
    
    // ========== MODAL CONNEXION ==========
    const connectLink = document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0985"]');
    const loginModal = document.querySelector('.cont-flex');
    const loginModalBg = document.querySelector('._3-fond-modal');
    
    if (connectLink) {
        connectLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (this.textContent.trim() === 'me connecter') {
                if (loginModal) loginModal.style.display = 'flex';
                if (loginModalBg) loginModalBg.style.display = 'block';
                if (userMenu) userMenu.style.display = 'none';
            }
        });
    }
    
    // Fermer modal connexion
    const closeLoginModal = document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd09dd"]');
    if (closeLoginModal) {
        closeLoginModal.addEventListener('click', function(e) {
            e.preventDefault();
            if (loginModal) loginModal.style.display = 'none';
            if (loginModalBg) loginModalBg.style.display = 'none';
        });
    }
    
    if (loginModalBg) {
        loginModalBg.addEventListener('click', function() {
            if (loginModal) loginModal.style.display = 'none';
            this.style.display = 'none';
        });
    }
    
    // ========== MODAL INFO PERSONNELLES ==========
    const infoPersoLink = document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0987"]');
    const infoPersoModal = document.querySelector('.info-perso-modal');
    const infoPersoModalBg = document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0c74"]');
    
    if (infoPersoLink) {
        infoPersoLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (infoPersoModal) infoPersoModal.style.display = 'block';
            if (infoPersoModalBg) infoPersoModalBg.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
        });
    }
    
    // Fermer modal info perso
    const closeInfoPersoModal = document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0c45"]');
    if (closeInfoPersoModal) {
        closeInfoPersoModal.addEventListener('click', function(e) {
            e.preventDefault();
            if (infoPersoModal) infoPersoModal.style.display = 'none';
            if (infoPersoModalBg) infoPersoModalBg.style.display = 'none';
        });
    }
    
    if (infoPersoModalBg) {
        infoPersoModalBg.addEventListener('click', function() {
            if (infoPersoModal) infoPersoModal.style.display = 'none';
            this.style.display = 'none';
        });
    }
    
    // ========== MENU PRINCIPAL (pages de contenu) ==========
    const contentSections = [
        document.querySelector('._3-0_sous-menu-content-0'), // A propos
        document.querySelector('._3-1_sous-menu-content-1'), // Gouvernements publiés
        document.querySelector('._3-2_sous-menu-content-2'), // Composer gouvernement
        document.querySelector('._3-3_sous-menu-content-3'), // Ajouter personnalité
        document.querySelector('._3-4_sous-menu-content-4')  // Liste personnalités
    ];
    
    const menuButtons = [
        null, // Pas de bouton pour A propos (c'est le logo)
        document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0efa"]'),
        document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0efd"]'),
        document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0f00"]'),
        document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0f03"]')
    ];
    
    function showSection(index) {
        contentSections.forEach((section, i) => {
            if (section) {
                section.style.display = (i === index) ? 'block' : 'none';
            }
        });
        
        // Gérer le style actif des boutons
        menuButtons.forEach((button, i) => {
            if (button) {
                if (i === index) {
                    button.classList.add('w--current');
                } else {
                    button.classList.remove('w--current');
                }
            }
        });
    }
    
    // Bouton "gouvernements publiés"
    if (menuButtons[1]) {
        menuButtons[1].addEventListener('click', function(e) {
            e.preventDefault();
            showSection(1);
        });
    }
    
    // Bouton "composer un gouvernement"
    if (menuButtons[2]) {
        menuButtons[2].addEventListener('click', function(e) {
            e.preventDefault();
            showSection(2);
        });
    }
    
    // Bouton "ajouter une personnalité"
    if (menuButtons[3]) {
        menuButtons[3].addEventListener('click', function(e) {
            e.preventDefault();
            showSection(3);
        });
    }
    
    // Bouton "liste des personnalités"
    if (menuButtons[4]) {
        menuButtons[4].addEventListener('click', function(e) {
            e.preventDefault();
            showSection(4);
        });
    }
    
    // Logo SOSGOUV pour revenir à l'accueil (A propos)
    const logo = document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0976"]');
    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            showSection(0);
        });
    }
    
    // ========== INITIALISATION ==========
    showSection(0);
});
