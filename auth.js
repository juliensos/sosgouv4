// Configuration Supabase
const SUPABASE_URL = 'https://lbcmwivxvzeortvftxsi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiY213aXZ4dnplb3J0dmZ0eHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mzc2MTgsImV4cCI6MjA3ODAxMzYxOH0.RN431cCTPF2D_1xH8HJX7Eey-s4STlU3F-ZZ8sxoE7I';

// Initialiser le client Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fonction de connexion
async function login(username, password) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !data) {
            return { success: false, message: 'Nom d\'utilisateur ou mot de passe incorrect' };
        }

        if (password === '123456') {
            const userSession = {
                id: data.id,
                username: data.username,
                isAdmin: data.is_admin,
                nom: data.nom || '',
                prenom: data.prenom || '',
                email: data.email || '',
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem('userSession', JSON.stringify(userSession));
            return { success: true, user: userSession };
        } else {
            return { success: false, message: 'Nom d\'utilisateur ou mot de passe incorrect' };
        }
    } catch (err) {
        console.error('Erreur de connexion:', err);
        return { success: false, message: 'Erreur de connexion' };
    }
}

// Fonction d'inscription
async function signup(username, password) {
    try {
        const passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
        
        const { data, error } = await supabase
            .from('users')
            .insert([{ username: username, password_hash: passwordHash, is_admin: false }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') return { success: false, message: 'Ce nom d\'utilisateur existe déjà' };
            return { success: false, message: 'Erreur lors de l\'inscription' };
        }

        const userSession = {
            id: data.id,
            username: data.username,
            isAdmin: data.is_admin,
            nom: data.nom || '',
            prenom: data.prenom || '',
            email: data.email || '',
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('userSession', JSON.stringify(userSession));
        return { success: true, user: userSession };
    } catch (err) {
        return { success: false, message: 'Erreur lors de l\'inscription' };
    }
}

// Déconnexion
function logout() {
    localStorage.removeItem('userSession');
    updateUIForLoggedOutUser();
    location.reload();
}

// Vérifier connexion
function isLoggedIn() {
    return localStorage.getItem('userSession') !== null;
}

// Récupérer session
function getUserSession() {
    const session = localStorage.getItem('userSession');
    return session ? JSON.parse(session) : null;
}

// UI utilisateur connecté
function updateUIForLoggedInUser(user) {
    const usernameDisplay = document.querySelector('.connected-username');
    if (usernameDisplay) {
        usernameDisplay.textContent = user.username;
        usernameDisplay.style.display = 'block';
    }

    const adminPart = document.querySelector('.admine-part');
    if (adminPart) adminPart.style.display = user.isAdmin ? 'flex' : 'none';

    const infoPersoForm = document.querySelector('form[id="email-form-16"]');
    if (infoPersoForm) {
        const inputs = infoPersoForm.querySelectorAll('input[type="text"]');
        if (inputs.length >= 5) {
            inputs[0].value = user.username;
            inputs[1].value = '••••••••';
            inputs[2].value = user.nom || '';
            inputs[3].value = user.prenom || '';
            inputs[4].value = user.email || '';
        }
    }

    const connectLink = document.querySelector('.menu-link[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0985"]');
    if (connectLink) {
        connectLink.textContent = 'me déconnecter';
        connectLink.onclick = (e) => { e.preventDefault(); logout(); };
    }
}

// UI utilisateur déconnecté
function updateUIForLoggedOutUser() {
    const usernameDisplay = document.querySelector('.connected-username');
    if (usernameDisplay) usernameDisplay.style.display = 'none';

    const adminPart = document.querySelector('.admine-part');
    if (adminPart) adminPart.style.display = 'none';

    const connectLink = document.querySelector('.menu-link[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0985"]');
    if (connectLink) {
        connectLink.textContent = 'me connecter';
        connectLink.onclick = null;
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    if (isLoggedIn()) {
        updateUIForLoggedInUser(getUserSession());
    } else {
        updateUIForLoggedOutUser();
    }

    // Formulaire connexion
    const loginForm = document.querySelector('form[id="login-form"]');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const result = await login(
                document.getElementById('login-username').value,
                document.getElementById('login-password').value
            );
            
            if (result.success) {
                document.querySelector('.cont-flex').style.display = 'none';
                document.querySelector('._3-fond-modal').style.display = 'none';
                location.reload();
            } else {
                alert(result.message);
            }
        });
    }

    // Formulaire inscription
    const signupForm = document.querySelector('form[id="signup-form"]');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('signup-password').value;
            const passwordConfirm = document.getElementById('signup-password-confirm').value;

            if (password !== passwordConfirm) {
                alert('Les mots de passe ne correspondent pas');
                return;
            }

            const result = await signup(document.getElementById('signup-username').value, password);
            
            if (result.success) {
                document.querySelector('.cont-flex').style.display = 'none';
                document.querySelector('._3-fond-modal').style.display = 'none';
                location.reload();
            } else {
                alert(result.message);
            }
        });
    }
    
    // Bouton changer de compte
    const changerCompteBtn = document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0c4d"]');
    if (changerCompteBtn) {
        changerCompteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('userSession');
            document.querySelector('._4-page-modal').style.display = 'none';
            document.querySelector('._3-fond-modal-pages').style.display = 'none';
            document.querySelector('.cont-flex').style.display = 'flex';
            document.querySelector('._3-fond-modal').style.display = 'block';
            updateUIForLoggedOutUser();
        });
    }
    
    // Enregistrer infos personnelles
    const saveInfoBtn = document.querySelector('[data-w-id="b9597464-fc2b-b33e-b4cb-35073abd0c65"]');
    if (saveInfoBtn) {
        saveInfoBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const user = getUserSession();
            if (!user) return alert('Vous devez être connecté');
            
            const inputs = document.querySelectorAll('form[id="email-form-16"] input[type="text"]');
            
            try {
                const { data, error } = await supabase
                    .from('users')
                    .update({
                        username: inputs[0].value,
                        nom: inputs[2].value || '',
                        prenom: inputs[3].value || '',
                        email: inputs[4].value || ''
                    })
                    .eq('id', user.id)
                    .select()
                    .single();
                
                if (error) return alert('Erreur : ' + error.message);
                
                localStorage.setItem('userSession', JSON.stringify({...user, ...data}));
                document.querySelector('.success-message-2').style.display = 'block';
                setTimeout(() => document.querySelector('.success-message-2').style.display = 'none', 3000);
            } catch (err) {
                alert('Erreur lors de la sauvegarde');
            }
        });
    }
});
