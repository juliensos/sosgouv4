// gouvernement.js - Gestion de la composition des gouvernements
// ================================================================

import { supabase, getCurrentUser } from './auth.js';

// ================================================================
// ÉTAT GLOBAL DU GOUVERNEMENT EN COURS DE COMPOSITION
// ================================================================

let gouvernementEnCours = {
    id: null,
    titre: '',
    description: '',
    postes: {
        regaliens: [], // 5 postes fixes
        nonRegaliens: [], // postes ajoutés dynamiquement
        delegues: [] // délégués ministériels
    }
};

// Les 5 secteurs régaliens fixes (ordre défini)
const SECTEURS_REGALIENS_FIXES = [
    { ordre: 1, nom: '1er ministre' },
    { ordre: 2, nom: 'Justice' },
    { ordre: 3, nom: 'Affaires étrangères' },
    { ordre: 4, nom: 'Économie' },
    { ordre: 5, nom: 'Intérieur' }
];

// Cache pour les données de référence
let cache = {
    secteurs: [],
    sousSecteurs: [],
    personnalites: [],
    secteursDefaut: {} // secteur_id => sous_secteurs[]
};

// ================================================================
// INITIALISATION
// ================================================================

export async function initGouvernement() {
    console.log('🏛️ Initialisation module Gouvernement');
    
    // Vérifier que l'utilisateur est connecté
    const user = await getCurrentUser();
    if (!user) {
        console.warn('⚠️ Utilisateur non connecté - redirection nécessaire');
        return;
    }

    // Charger les données de référence
    await chargerDonneesReference();
    
    // Initialiser les postes régaliens
    await initialiserPostesRegaliens();
    
    // Attacher les event listeners
    attacherEventListeners();
    
    console.log('✅ Module Gouvernement initialisé');
}

// ================================================================
// CHARGEMENT DES DONNÉES DE RÉFÉRENCE
// ================================================================

async function chargerDonneesReference() {
    try {
        // Charger tous les secteurs
        const { data: secteurs, error: secteursError } = await supabase
            .from('secteurs')
            .select('*')
            .order('ordre', { ascending: true });
        
        if (secteursError) throw secteursError;
        cache.secteurs = secteurs;

        // Charger tous les sous-secteurs
        const { data: sousSecteurs, error: sousSectError } = await supabase
            .from('sous_secteurs')
            .select('*')
            .order('nom', { ascending: true });
        
        if (sousSectError) throw sousSectError;
        cache.sousSecteurs = sousSecteurs;

        // Charger les associations secteurs <-> sous-secteurs par défaut
        const { data: associations, error: assocError } = await supabase
            .from('secteurs_sous_secteurs_defaut')
            .select('secteur_id, sous_secteur_id');
        
        if (assocError) throw assocError;
        
        // Organiser par secteur
        associations.forEach(assoc => {
            if (!cache.secteursDefaut[assoc.secteur_id]) {
                cache.secteursDefaut[assoc.secteur_id] = [];
            }
            const sousSecteur = cache.sousSecteurs.find(ss => ss.id === assoc.sous_secteur_id);
            if (sousSecteur) {
                cache.secteursDefaut[assoc.secteur_id].push(sousSecteur);
            }
        });

        // Charger les personnalités (nom, prénom, métiers seulement pour l'autocomplete)
        const { data: personnalites, error: persoError } = await supabase
            .from('personnalites')
            .select('id, nom, prenom, metiers')
            .order('nom', { ascending: true });
        
        if (persoError) throw persoError;
        cache.personnalites = personnalites;

        console.log('📦 Données de référence chargées:', {
            secteurs: cache.secteurs.length,
            sousSecteurs: cache.sousSecteurs.length,
            personnalites: cache.personnalites.length
        });

    } catch (error) {
        console.error('❌ Erreur chargement données de référence:', error);
    }
}

// ================================================================
// INITIALISATION DES POSTES RÉGALIENS
// ================================================================

async function initialiserPostesRegaliens() {
    const container = document.querySelector('._3-bloc-minsteres');
    if (!container) return;

    // Vider le container
    container.innerHTML = '';

    // Créer les 5 postes régaliens fixes
    for (const secteurInfo of SECTEURS_REGALIENS_FIXES) {
        // Trouver le secteur correspondant dans la base
        const secteur = cache.secteurs.find(s => 
            s.type === 'regalien' && 
            s.nom.toLowerCase().includes(secteurInfo.nom.toLowerCase())
        );

        if (!secteur) {
            console.warn(`⚠️ Secteur régalien non trouvé: ${secteurInfo.nom}`);
            continue;
        }

        // Récupérer les sous-secteurs par défaut
        const sousSecteurs = cache.secteursDefaut[secteur.id] || [];

        // Créer le bloc HTML
        const blocHTML = creerBlocPosteRegalien(secteur, sousSecteurs);
        container.insertAdjacentHTML('beforeend', blocHTML);

        // Ajouter au state
        gouvernementEnCours.postes.regaliens.push({
            secteur_id: secteur.id,
            personnalite_id: null,
            sous_secteurs: sousSecteurs.map(ss => ss.id),
            nom_poste_personnalise: null
        });
    }

    // Attacher les event listeners pour les inputs
    attacherEventListenersPostes();
}

// ================================================================
// CRÉATION HTML DES BLOCS DE POSTES
// ================================================================

function creerBlocPosteRegalien(secteur, sousSecteurs) {
    const sousSecteursList = sousSecteurs.map(ss => ss.nom).join(', ');
    
    return `
        <div class="_3-bloc-min-r" data-secteur-id="${secteur.id}" data-type="regalien">
            <div class="_3-gov-line-1">
                <input 
                    class="mon-input3 ministre-input w-input" 
                    maxlength="256" 
                    placeholder="nom du ministre" 
                    type="text" 
                    data-secteur-id="${secteur.id}"
                    autocomplete="off"
                />
                <div class="autocomplete-results" style="display:none;"></div>
                <div class="_3-gov-mini-buttons">
                    <a href="#" class="_2-mini-bouton loupe w-inline-block" data-action="open-liste-perso" data-secteur-id="${secteur.id}">
                        <div class="_2-picto-fontello-bouton"></div>
                    </a>
                    <a href="#" class="_2-mini-bouton people w-inline-block" data-action="add-perso" data-secteur-id="${secteur.id}">
                        <div class="_2-picto-fontello-bouton"></div>
                    </a>
                </div>
            </div>
            <div class="_3-gov-line-2">
                <h3 class="heading-23">${secteur.intitule_poste_defaut || secteur.nom}</h3>
                <div class="_3-sous-secteur">
                    ${sousSecteursList}
                    <a href="#" class="_2-code-link-button" data-action="modifier-sous-secteurs" data-secteur-id="${secteur.id}">modifier</a>
                </div>
            </div>
        </div>
    `;
}

function creerBlocPosteNonRegalien(secteurs, sousSecteurs) {
    // Générer l'intitulé automatique à partir des secteurs sélectionnés
    const nomsSecteurs = secteurs.map(s => s.nom);
    let intitule = '';
    
    if (nomsSecteurs.length === 1) {
        intitule = `Ministre ${nomsSecteurs[0].toLowerCase().startsWith('de') ? nomsSecteurs[0] : 'de ' + nomsSecteurs[0]}`;
    } else {
        intitule = `Ministre de ${nomsSecteurs.join(' et de ')}`;
    }

    const sousSecteursList = sousSecteurs.map(ss => ss.nom).join(', ');
    const secteursIds = secteurs.map(s => s.id).join(',');
    const tempId = Date.now(); // ID temporaire pour identifier le bloc

    return `
        <div class="_3-bloc-min-nr-step2" data-secteurs-ids="${secteursIds}" data-type="non-regalien" data-temp-id="${tempId}" style="display:block;">
            <div class="_3-gov-line-1">
                <input 
                    class="mon-input3 ministre-input w-input" 
                    maxlength="256" 
                    placeholder="nom du ministre" 
                    type="text" 
                    data-temp-id="${tempId}"
                    autocomplete="off"
                />
                <div class="autocomplete-results" style="display:none;"></div>
                <div class="_3-gov-mini-buttons">
                    <a href="#" class="_2-mini-bouton loupe w-inline-block" data-action="open-liste-perso" data-temp-id="${tempId}">
                        <div class="_2-picto-fontello-bouton"></div>
                    </a>
                    <a href="#" class="_2-mini-bouton people w-inline-block" data-action="add-perso" data-temp-id="${tempId}">
                        <div class="_2-picto-fontello-bouton"></div>
                    </a>
                    <a href="#" class="_2-picto-fontello-bouton x w-inline-block" data-action="supprimer-poste" data-temp-id="${tempId}">
                        <div class="fontello-icon pink"></div>
                    </a>
                </div>
            </div>
            <div class="_3-gov-line-2">
                <h3 class="heading-23">
                    ${intitule}
                    <a href="#" class="_2-code-link-button" data-action="modifier-intitule" data-temp-id="${tempId}">modifier l'intitulé</a>
                </h3>
                <div class="_2-sous-secteurs no">
                    ${sousSecteursList}
                    <a href="#" class="_2-code-link-button" data-action="modifier-sous-secteurs" data-temp-id="${tempId}">modifier</a>
                </div>
            </div>
        </div>
    `;
}

function creerBlocDelegue(ministeresRattachement, fonction) {
    const tempId = Date.now();
    const ministeresIds = ministeresRattachement.map(m => m.id).join(',');
    const ministeresNoms = ministeresRattachement.map(m => m.nom).join(', ');

    return `
        <div class="_3-bloc-del-nr-step2" data-ministeres-ids="${ministeresIds}" data-type="delegue" data-temp-id="${tempId}" style="display:block;">
            <div class="_3-gov-line-1">
                <input 
                    class="mon-input3 ministre-input w-input" 
                    maxlength="256" 
                    placeholder="nom du délégué ministériel" 
                    type="text" 
                    data-temp-id="${tempId}"
                    autocomplete="off"
                />
                <div class="autocomplete-results" style="display:none;"></div>
                <div class="_3-gov-mini-buttons">
                    <a href="#" class="_2-mini-bouton loupe w-inline-block" data-action="open-liste-perso" data-temp-id="${tempId}">
                        <div class="_2-picto-fontello-bouton"></div>
                    </a>
                    <a href="#" class="_2-mini-bouton people w-inline-block" data-action="add-perso" data-temp-id="${tempId}">
                        <div class="_2-picto-fontello-bouton"></div>
                    </a>
                    <a href="#" class="_2-picto-fontello-bouton x w-inline-block" data-action="supprimer-poste" data-temp-id="${tempId}">
                        <div class="fontello-icon pink"></div>
                    </a>
                </div>
            </div>
            <div class="_3-gov-line-2">
                <h3 class="heading-23">
                    délégué auprès du ministère de ${ministeresNoms}, ${fonction}
                    <a href="#" class="_2-code-link-button" data-action="modifier-delegue" data-temp-id="${tempId}">modifier</a>
                </h3>
            </div>
        </div>
    `;
}

// ================================================================
// EVENT LISTENERS
// ================================================================

function attacherEventListeners() {
    // Bouton "Ajouter ministère" (non-régalien)
    const btnAjouterMinistere = document.querySelector('[data-w-id="91f0827b-9d2f-ca59-b104-920ab5a68f23"]');
    if (btnAjouterMinistere) {
        btnAjouterMinistere.addEventListener('click', (e) => {
            e.preventDefault();
            ouvrirModalSecteursNonRegaliens();
        });
    }

    // Bouton "Ajouter délégué ministériel"
    const btnAjouterDelegue = document.querySelector('[data-w-id="f88e3528-3e5b-fcff-ca05-b7c7a0d33607"]');
    if (btnAjouterDelegue) {
        btnAjouterDelegue.addEventListener('click', (e) => {
            e.preventDefault();
            ouvrirModalDefinirDelegue();
        });
    }

    // Boutons Brouillon et Publier
    const btnBrouillon = document.querySelector('._w-link-bloc-button:not(.publier)');
    const btnPublier = document.querySelector('._w-link-bloc-button.publier');
    
    if (btnBrouillon) {
        btnBrouillon.addEventListener('click', (e) => {
            e.preventDefault();
            sauvegarderGouvernement(false); // brouillon
        });
    }
    
    if (btnPublier) {
        btnPublier.addEventListener('click', (e) => {
            e.preventDefault();
            sauvegarderGouvernement(true); // publier
        });
    }

    // Input titre et description
    const inputTitre = document.querySelector('input[placeholder="nom du gouvernement*"]');
    const textareaDesc = document.querySelector('textarea[placeholder="Vision de l\'auteur"]');
    
    if (inputTitre) {
        inputTitre.addEventListener('input', (e) => {
            gouvernementEnCours.titre = e.target.value;
        });
    }
    
    if (textareaDesc) {
        textareaDesc.addEventListener('input', (e) => {
            gouvernementEnCours.description = e.target.value;
        });
    }
}

function attacherEventListenersPostes() {
    // Event delegation pour tous les boutons d'actions
    document.addEventListener('click', async (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        e.preventDefault();
        const action = target.dataset.action;
        const secteurId = target.dataset.secteurId;
        const tempId = target.dataset.tempId;

        switch(action) {
            case 'open-liste-perso':
                ouvrirModalListePersonnalites(secteurId || tempId);
                break;
            case 'add-perso':
                ouvrirModalAjouterPersonnalite(secteurId || tempId);
                break;
            case 'modifier-sous-secteurs':
                ouvrirModalModifierSousSecteurs(secteurId || tempId);
                break;
            case 'modifier-intitule':
                ouvrirModalModifierIntitule(tempId);
                break;
            case 'supprimer-poste':
                supprimerPoste(tempId);
                break;
            case 'modifier-delegue':
                ouvrirModalModifierDelegue(tempId);
                break;
        }
    });

    // Autocomplete sur les inputs de ministre
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('ministre-input')) {
            handleAutocomplete(e.target);
        }
    });

    // Fermer l'autocomplete si on clique ailleurs
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('ministre-input')) {
            document.querySelectorAll('.autocomplete-results').forEach(el => {
                el.style.display = 'none';
            });
        }
    });
}

// ================================================================
// AUTOCOMPLETE PERSONNALITÉS
// ================================================================

function handleAutocomplete(input) {
    const query = input.value.trim().toLowerCase();
    const resultsContainer = input.nextElementSibling;
    
    if (!resultsContainer || !resultsContainer.classList.contains('autocomplete-results')) {
        return;
    }

    if (query.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }

    // Filtrer les personnalités
    const matches = cache.personnalites.filter(p => {
        const nomComplet = `${p.nom} ${p.prenom}`.toLowerCase();
        return nomComplet.includes(query);
    }).slice(0, 10); // Limiter à 10 résultats

    if (matches.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }

    // Afficher les résultats
    resultsContainer.innerHTML = matches.map(p => `
        <div class="autocomplete-item" data-perso-id="${p.id}">
            <strong>${p.nom} ${p.prenom}</strong>
            <small>${p.metiers ? p.metiers.join(', ') : ''}</small>
        </div>
    `).join('');

    resultsContainer.style.display = 'block';

    // Event listeners sur les résultats
    resultsContainer.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            const persoId = item.dataset.persoId;
            const perso = cache.personnalites.find(p => p.id === persoId);
            if (perso) {
                input.value = `${perso.nom} ${perso.prenom}`;
                input.dataset.persoId = persoId;
                resultsContainer.style.display = 'none';
                
                // Mettre à jour le state
                mettreAJourPersonnalitePoste(input, persoId);
            }
        });
    });
}

function mettreAJourPersonnalitePoste(input, personnaliteId) {
    const secteurId = input.dataset.secteurId;
    const tempId = input.dataset.tempId;

    if (secteurId) {
        // Poste régalien
        const poste = gouvernementEnCours.postes.regaliens.find(p => p.secteur_id === secteurId);
        if (poste) {
            poste.personnalite_id = personnaliteId;
        }
    } else if (tempId) {
        // Poste non-régalien ou délégué
        const posteNonReg = gouvernementEnCours.postes.nonRegaliens.find(p => p.temp_id === tempId);
        if (posteNonReg) {
            posteNonReg.personnalite_id = personnaliteId;
        } else {
            const delegue = gouvernementEnCours.postes.delegues.find(d => d.temp_id === tempId);
            if (delegue) {
                delegue.personnalite_id = personnaliteId;
            }
        }
    }
}

// ================================================================
// MODAUX - SECTEURS NON RÉGALIENS
// ================================================================

function ouvrirModalSecteursNonRegaliens() {
    const modal = document.querySelector('.pm-parent.secteur-non-regalien');
    if (!modal) return;

    // Remplir la liste des secteurs non-régaliens
    const container = modal.querySelector('#liste-secteurs-non-regaliens');
    if (!container) return;

    const secteursNonRegaliens = cache.secteurs.filter(s => s.type === 'non_regalien');
    
    container.innerHTML = secteursNonRegaliens.map(secteur => `
        <label class="w-checkbox _w-checkbox">
            <div class="w-checkbox-input w-checkbox-input--inputType-custom checkbox"></div>
            <input 
                type="checkbox" 
                id="secteur-${secteur.id}" 
                name="secteur" 
                value="${secteur.id}"
                data-secteur-nom="${secteur.nom}"
                style="opacity:0;position:absolute;z-index:-1"
            />
            <span class="checkbox-label-2 w-form-label" for="secteur-${secteur.id}">${secteur.nom}</span>
        </label>
    `).join('');

    modal.style.display = 'block';

    // Event listener sur le bouton valider
    const btnValider = modal.querySelector('#valider-secteurs-non-regaliens');
    if (btnValider) {
        btnValider.onclick = (e) => {
            e.preventDefault();
            
            // Récupérer les secteurs cochés
            const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
            const secteursSelectionnes = Array.from(checkboxes).map(cb => {
                return cache.secteurs.find(s => s.id === cb.value);
            }).filter(Boolean);

            if (secteursSelectionnes.length === 0) {
                alert('⚠️ Veuillez sélectionner au moins un secteur');
                return;
            }

            ajouterPosteNonRegalien(secteursSelectionnes);
            fermerModal(modal);
        };
    }

    // Bouton fermer
    const btnFermer = modal.querySelector('._3-close-bouton');
    if (btnFermer) {
        btnFermer.onclick = (e) => {
            e.preventDefault();
            fermerModal(modal);
        };
    }
    
    // Fond modal
    const fondModal = modal.querySelector('._3-fond-modal');
    if (fondModal) {
        fondModal.onclick = () => fermerModal(modal);
    }
}

function ajouterPosteNonRegalien(secteurs) {
    // Récupérer tous les sous-secteurs par défaut des secteurs sélectionnés
    const sousSecteurs = [];
    secteurs.forEach(secteur => {
        const ss = cache.secteursDefaut[secteur.id] || [];
        sousSecteurs.push(...ss);
    });

    const tempId = Date.now().toString();
    const container = document.querySelector('._3-bloc-minsteres').parentElement;
    const btnAjouter = container.querySelector('[data-w-id="91f0827b-9d2f-ca59-b104-920ab5a68f23"]');

    // Insérer avant le bouton "Ajouter ministère"
    const blocHTML = creerBlocPosteNonRegalien(secteurs, sousSecteurs);
    btnAjouter.insertAdjacentHTML('beforebegin', blocHTML);

    // Ajouter au state
    gouvernementEnCours.postes.nonRegaliens.push({
        temp_id: tempId,
        secteurs_ids: secteurs.map(s => s.id),
        personnalite_id: null,
        sous_secteurs: sousSecteurs.map(ss => ss.id),
        nom_poste_personnalise: null
    });

    // Réattacher les event listeners
    attacherEventListenersPostes();
}

// ================================================================
// MODAUX - DÉLÉGUÉ MINISTÉRIEL
// ================================================================

function ouvrirModalDefinirDelegue() {
    const modal = document.querySelector('.pm-parent.definir-delegu');
    if (!modal) return;

    // Remplir la liste des ministères de rattachement possibles
    const container = modal.querySelector('#liste-ministeres-rattachement');
    if (!container) {
        console.warn('Container #liste-ministeres-rattachement non trouvé');
        modal.style.display = 'block';
        return;
    }

    // Récupérer tous les postes actuels (régaliens et non-régaliens)
    const ministeresDisponibles = [];
    
    // Postes régaliens
    gouvernementEnCours.postes.regaliens.forEach(poste => {
        const secteur = cache.secteurs.find(s => s.id === poste.secteur_id);
        if (secteur) {
            ministeresDisponibles.push({
                id: secteur.id,
                nom: secteur.nom,
                type: 'regalien'
            });
        }
    });
    
    // Postes non-régaliens
    gouvernementEnCours.postes.nonRegaliens.forEach(poste => {
        const secteur = cache.secteurs.find(s => s.id === poste.secteurs_ids[0]);
        if (secteur) {
            const nom = poste.nom_poste_personnalise || secteur.nom;
            ministeresDisponibles.push({
                id: poste.temp_id,
                nom: nom,
                type: 'non_regalien'
            });
        }
    });

    if (ministeresDisponibles.length === 0) {
        alert('⚠️ Vous devez d\'abord créer au moins un ministère');
        return;
    }

    container.innerHTML = ministeresDisponibles.map(ministere => `
        <label class="w-checkbox _w-checkbox">
            <div class="w-checkbox-input w-checkbox-input--inputType-custom checkbox"></div>
            <input 
                type="checkbox" 
                id="ministere-${ministere.id}" 
                name="ministere" 
                value="${ministere.id}"
                data-ministere-nom="${ministere.nom}"
                data-ministere-type="${ministere.type}"
                style="opacity:0;position:absolute;z-index:-1"
            />
            <span class="checkbox-label-2 w-form-label" for="ministere-${ministere.id}">${ministere.nom}</span>
        </label>
    `).join('');

    modal.style.display = 'block';

    // Event listener sur le bouton valider
    const btnValider = modal.querySelector('#valider-delegue');
    if (btnValider) {
        btnValider.onclick = (e) => {
            e.preventDefault();
            
            // Récupérer les ministères cochés
            const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
            if (checkboxes.length === 0) {
                alert('⚠️ Veuillez sélectionner au moins un ministère de rattachement');
                return;
            }

            const ministeresRattachement = Array.from(checkboxes).map(cb => ({
                id: cb.value,
                nom: cb.dataset.ministereNom
            }));
            
            // Récupérer la fonction
            const fonctionInput = modal.querySelector('#fonction-delegue');
            const fonction = fonctionInput?.value.trim() || 'en charge de...';

            if (!fonction || fonction === 'en charge de...') {
                alert('⚠️ Veuillez définir une fonction pour le délégué');
                return;
            }

            ajouterDelegue(ministeresRattachement, fonction);
            
            // Réinitialiser le formulaire
            if (fonctionInput) fonctionInput.value = '';
            container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            
            fermerModal(modal);
        };
    }

    // Bouton fermer
    const btnFermer = modal.querySelector('._3-close-bouton');
    if (btnFermer) {
        btnFermer.onclick = (e) => {
            e.preventDefault();
            fermerModal(modal);
        };
    }
    
    // Fond modal
    const fondModal = modal.querySelector('._3-fond-modal');
    if (fondModal) {
        fondModal.onclick = () => fermerModal(modal);
    }
}

function ajouterDelegue(ministeres, fonction) {
    const tempId = Date.now().toString();
    const container = document.querySelector('#delegues-container');
    const btnAjouter = container?.querySelector('[data-w-id="f88e3528-3e5b-fcff-ca05-b7c7a0d33607"]');

    if (!container || !btnAjouter) return;

    const blocHTML = creerBlocDelegue(ministeres, fonction);
    btnAjouter.insertAdjacentHTML('beforebegin', blocHTML);

    // Ajouter au state
    gouvernementEnCours.postes.delegues.push({
        temp_id: tempId,
        personnalite_id: null,
        ministeres_rattachement: ministeres.map(m => m.id),
        fonction: fonction
    });

    attacherEventListenersPostes();
}

// ================================================================
// MODAUX - LISTE PERSONNALITÉS
// ================================================================

function ouvrirModalListePersonnalites(identifier) {
    const modal = document.querySelector('.pm-parent.liste-personnalit');
    if (!modal) return;

    modal.style.display = 'block';
    modal.dataset.currentIdentifier = identifier;

    const container = modal.querySelector('#liste-personnalites-content');
    const selectTri = modal.querySelector('#tri-personnalites');
    
    if (!container) return;

    // Fonction pour afficher la liste
    function afficherListePersonnalites(tri = 'alpha') {
        let personnalites = [...cache.personnalites];
        
        if (tri === 'alpha') {
            personnalites.sort((a, b) => a.nom.localeCompare(b.nom));
        } else if (tri === 'metier') {
            personnalites.sort((a, b) => {
                const metierA = a.metiers && a.metiers.length > 0 ? a.metiers[0] : '';
                const metierB = b.metiers && b.metiers.length > 0 ? b.metiers[0] : '';
                return metierA.localeCompare(metierB);
            });
        }

        // Grouper par première lettre si tri alphabétique
        if (tri === 'alpha') {
            const groupes = {};
            personnalites.forEach(p => {
                const lettre = p.nom[0].toUpperCase();
                if (!groupes[lettre]) groupes[lettre] = [];
                groupes[lettre].push(p);
            });

            container.innerHTML = Object.keys(groupes).sort().map(lettre => `
                <div class="_3-title-bloc-padd-10-left">
                    <h1 class="heading-25">${lettre}</h1>
                </div>
                ${groupes[lettre].map(p => `
                    <div class="div-block-296" style="cursor: pointer; padding: 10px; border-bottom: 1px solid #eee;" data-perso-id="${p.id}">
                        <a href="#" class="_w-courant _w-bold _w-maj" style="pointer-events: none;">${p.nom}</a>
                        <div class="_w-courant">${p.prenom}</div>
                        <div class="_w-courant grey-courant">${p.metiers ? p.metiers.join(', ') : ''}</div>
                    </div>
                `).join('')}
            `).join('');
        } else {
            // Affichage simple si tri par métier
            container.innerHTML = personnalites.map(p => `
                <div class="div-block-296" style="cursor: pointer; padding: 10px; border-bottom: 1px solid #eee;" data-perso-id="${p.id}">
                    <a href="#" class="_w-courant _w-bold _w-maj" style="pointer-events: none;">${p.nom}</a>
                    <div class="_w-courant">${p.prenom}</div>
                    <div class="_w-courant grey-courant">${p.metiers ? p.metiers.join(', ') : ''}</div>
                </div>
            `).join('');
        }

        // Event listeners sur les items
        container.querySelectorAll('.div-block-296').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const persoId = item.dataset.persoId;
                const perso = cache.personnalites.find(p => p.id === persoId);
                
                if (perso) {
                    selectionnerPersonnalite(identifier, perso);
                    fermerModal(modal);
                }
            });
        });
    }

    // Affichage initial
    afficherListePersonnalites('alpha');

    // Event listener sur le tri
    if (selectTri) {
        selectTri.addEventListener('change', (e) => {
            afficherListePersonnalites(e.target.value);
        });
    }

    // Bouton fermer
    const btnFermer = modal.querySelector('._3-close-bouton');
    if (btnFermer) {
        btnFermer.onclick = (e) => {
            e.preventDefault();
            fermerModal(modal);
        };
    }
    
    // Fond modal
    const fondModal = modal.querySelector('._3-fond-modal');
    if (fondModal) {
        fondModal.onclick = () => fermerModal(modal);
    }
}

function selectionnerPersonnalite(identifier, personnalite) {
    // Trouver l'input correspondant et le remplir
    let input = document.querySelector(`input[data-secteur-id="${identifier}"]`);
    if (!input) {
        input = document.querySelector(`input[data-temp-id="${identifier}"]`);
    }
    
    if (input) {
        input.value = `${personnalite.nom} ${personnalite.prenom}`;
        input.dataset.persoId = personnalite.id;
        mettreAJourPersonnalitePoste(input, personnalite.id);
    }
}

// ================================================================
// MODAUX - AJOUTER PERSONNALITÉ
// ================================================================

function ouvrirModalAjouterPersonnalite(identifier) {
    const modal = document.querySelector('.pm-parent.ajouter-personnalit');
    if (!modal) return;

    modal.style.display = 'block';
    modal.dataset.currentIdentifier = identifier;

    // Bouton fermer
    const btnFermer = modal.querySelector('._3-close-bouton');
    if (btnFermer) {
        btnFermer.onclick = (e) => {
            e.preventDefault();
            fermerModal(modal);
        };
    }
}

// ================================================================
// AUTRES MODAUX
// ================================================================

function ouvrirModalModifierSousSecteurs(identifier) {
    const modal = document.querySelector('.pm-parent.choisir-sous-secteur');
    if (!modal) return;

    modal.style.display = 'block';
    modal.dataset.currentIdentifier = identifier;

    // Déterminer quel poste est concerné
    let poste = null;
    let secteurIds = [];
    
    // Chercher dans les postes régaliens
    poste = gouvernementEnCours.postes.regaliens.find(p => p.secteur_id === identifier);
    if (poste) {
        secteurIds = [poste.secteur_id];
    } else {
        // Chercher dans les postes non-régaliens
        poste = gouvernementEnCours.postes.nonRegaliens.find(p => p.temp_id === identifier);
        if (poste) {
            secteurIds = poste.secteurs_ids;
        }
    }

    if (!poste) {
        console.warn('Poste non trouvé pour identifier:', identifier);
        return;
    }

    // Récupérer tous les sous-secteurs possibles pour les secteurs du poste
    const sousSecteursPossibles = new Set();
    secteurIds.forEach(secteurId => {
        const ss = cache.secteursDefaut[secteurId] || [];
        ss.forEach(s => sousSecteursPossibles.add(s));
    });

    const container = modal.querySelector('#liste-sous-secteurs');
    if (!container) return;

    // Afficher les sous-secteurs avec ceux actuellement sélectionnés cochés
    container.innerHTML = Array.from(sousSecteursPossibles).map(sousSecteur => {
        const checked = poste.sous_secteurs && poste.sous_secteurs.includes(sousSecteur.id) ? 'checked' : '';
        return `
            <label class="w-checkbox _w-checkbox">
                <div class="w-checkbox-input w-checkbox-input--inputType-custom checkbox ${checked ? 'w--redirected-checked' : ''}"></div>
                <input 
                    type="checkbox" 
                    id="ss-${sousSecteur.id}" 
                    name="sous-secteur" 
                    value="${sousSecteur.id}"
                    data-ss-nom="${sousSecteur.nom}"
                    style="opacity:0;position:absolute;z-index:-1"
                    ${checked}
                />
                <span class="checkbox-label-2 w-form-label" for="ss-${sousSecteur.id}">${sousSecteur.nom}</span>
            </label>
        `;
    }).join('');

    // Event listener sur le bouton valider
    const btnValider = modal.querySelector('#valider-sous-secteurs');
    if (btnValider) {
        btnValider.onclick = (e) => {
            e.preventDefault();
            
            // Récupérer les sous-secteurs cochés
            const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
            const nouveauxSousSecteurs = Array.from(checkboxes).map(cb => cb.value);

            // Mettre à jour le poste
            poste.sous_secteurs = nouveauxSousSecteurs;

            // Mettre à jour l'affichage dans le DOM
            const bloc = document.querySelector(`[data-secteur-id="${identifier}"], [data-temp-id="${identifier}"]`);
            if (bloc) {
                const sousSecteurDiv = bloc.querySelector('._3-sous-secteur, ._2-sous-secteurs');
                if (sousSecteurDiv) {
                    const nomsSousSecteurs = nouveauxSousSecteurs
                        .map(id => cache.sousSecteurs.find(ss => ss.id === id)?.nom)
                        .filter(Boolean)
                        .join(', ');
                    
                    const lienModifier = sousSecteurDiv.querySelector('a');
                    sousSecteurDiv.innerHTML = nomsSousSecteurs + ' ';
                    if (lienModifier) {
                        sousSecteurDiv.appendChild(lienModifier);
                    }
                }
            }

            fermerModal(modal);
        };
    }

    const btnFermer = modal.querySelector('._3-close-bouton');
    if (btnFermer) {
        btnFermer.onclick = (e) => {
            e.preventDefault();
            fermerModal(modal);
        };
    }
    
    const fondModal = modal.querySelector('._3-fond-modal');
    if (fondModal) {
        fondModal.onclick = () => fermerModal(modal);
    }
}

function ouvrirModalModifierIntitule(tempId) {
    const modal = document.querySelector('.pm-parent.modifier-intitul');
    if (!modal) return;

    modal.style.display = 'block';
    modal.dataset.currentTempId = tempId;

    // Récupérer l'intitulé actuel
    const poste = gouvernementEnCours.postes.nonRegaliens.find(p => p.temp_id === tempId);
    const input = modal.querySelector('input[id="field-5"]');
    
    if (input && poste) {
        input.value = poste.nom_poste_personnalise || '';
    }

    const btnValider = modal.querySelector('[data-w-id="6d835420-576d-e619-0305-5b784b53cb47"]');
    if (btnValider) {
        btnValider.onclick = (e) => {
            e.preventDefault();
            
            const nouvelIntitule = input.value;
            if (poste) {
                poste.nom_poste_personnalise = nouvelIntitule;
                
                // Mettre à jour le DOM
                const bloc = document.querySelector(`[data-temp-id="${tempId}"]`);
                if (bloc) {
                    const h3 = bloc.querySelector('h3');
                    if (h3) {
                        h3.innerHTML = `${nouvelIntitule} <a href="#" class="_2-code-link-button" data-action="modifier-intitule" data-temp-id="${tempId}">modifier l'intitulé</a>`;
                    }
                }
            }

            fermerModal(modal);
        };
    }

    const btnFermer = modal.querySelector('._3-close-bouton');
    if (btnFermer) {
        btnFermer.onclick = (e) => {
            e.preventDefault();
            fermerModal(modal);
        };
    }
}

function ouvrirModalModifierDelegue(tempId) {
    const modal = document.querySelector('.pm-parent.definir-delegu');
    if (!modal) return;

    modal.style.display = 'block';
    modal.dataset.editTempId = tempId;

    // Pré-remplir avec les données actuelles
    const delegue = gouvernementEnCours.postes.delegues.find(d => d.temp_id === tempId);
    if (delegue) {
        const textarea = modal.querySelector('textarea[id="field-8"]');
        if (textarea) {
            textarea.value = delegue.fonction;
        }
    }

    const btnFermer = modal.querySelector('._3-close-bouton');
    if (btnFermer) {
        btnFermer.onclick = (e) => {
            e.preventDefault();
            fermerModal(modal);
        };
    }
}

function fermerModal(modal) {
    modal.style.display = 'none';
    // Nettoyer les datasets
    delete modal.dataset.currentIdentifier;
    delete modal.dataset.currentTempId;
    delete modal.dataset.editTempId;
}

// ================================================================
// SUPPRESSION DE POSTE
// ================================================================

function supprimerPoste(tempId) {
    if (!confirm('Voulez-vous vraiment supprimer ce poste ?')) return;

    // Supprimer du DOM
    const bloc = document.querySelector(`[data-temp-id="${tempId}"]`);
    if (bloc) {
        bloc.remove();
    }

    // Supprimer du state
    gouvernementEnCours.postes.nonRegaliens = 
        gouvernementEnCours.postes.nonRegaliens.filter(p => p.temp_id !== tempId);
    
    gouvernementEnCours.postes.delegues = 
        gouvernementEnCours.postes.delegues.filter(d => d.temp_id !== tempId);
}

// ================================================================
// SAUVEGARDE DU GOUVERNEMENT
// ================================================================

async function sauvegarderGouvernement(publier = false) {
    try {
        // Validation
        if (!gouvernementEnCours.titre || gouvernementEnCours.titre.trim() === '') {
            alert('⚠️ Veuillez donner un nom à votre gouvernement');
            return;
        }

        // Vérifier qu'au moins un poste régalien est rempli
        const postesRemplis = gouvernementEnCours.postes.regaliens.filter(p => p.personnalite_id !== null);
        if (postesRemplis.length === 0) {
            alert('⚠️ Veuillez nommer au moins un ministre');
            return;
        }

        const user = await getCurrentUser();
        if (!user) {
            alert('⚠️ Vous devez être connecté pour sauvegarder un gouvernement');
            return;
        }

        console.log('💾 Sauvegarde du gouvernement...', { publier });

        // 1. Créer ou mettre à jour le gouvernement
        const gouvernementData = {
            titre: gouvernementEnCours.titre,
            description: gouvernementEnCours.description || null,
            is_published: publier,
            created_by: user.id
        };

        let gouvernementId = gouvernementEnCours.id;

        if (gouvernementId) {
            // Mise à jour
            const { error: updateError } = await supabase
                .from('gouvernements')
                .update(gouvernementData)
                .eq('id', gouvernementId);
            
            if (updateError) throw updateError;
        } else {
            // Création
            const { data, error: insertError } = await supabase
                .from('gouvernements')
                .insert(gouvernementData)
                .select()
                .single();
            
            if (insertError) throw insertError;
            gouvernementId = data.id;
            gouvernementEnCours.id = gouvernementId;
        }

        // 2. Supprimer les anciens postes
        await supabase
            .from('postes_gouvernement')
            .delete()
            .eq('gouvernement_id', gouvernementId);

        // 3. Insérer les nouveaux postes
        const tousLesPostes = [];
        let ordre = 1;

        // Postes régaliens
        for (const poste of gouvernementEnCours.postes.regaliens) {
            if (poste.personnalite_id) {
                tousLesPostes.push({
                    gouvernement_id: gouvernementId,
                    type: 'ministre_regalien',
                    personnalite_id: poste.personnalite_id,
                    secteur_id: poste.secteur_id,
                    nom_poste_personnalise: poste.nom_poste_personnalise,
                    ordre: ordre++
                });
            }
        }

        // Postes non-régaliens
        for (const poste of gouvernementEnCours.postes.nonRegaliens) {
            if (poste.personnalite_id) {
                tousLesPostes.push({
                    gouvernement_id: gouvernementId,
                    type: 'ministre_non_regalien',
                    personnalite_id: poste.personnalite_id,
                    secteur_id: poste.secteurs_ids[0], // Premier secteur comme principal
                    nom_poste_personnalise: poste.nom_poste_personnalise,
                    ordre: ordre++
                });
            }
        }

        // Délégués
        for (const delegue of gouvernementEnCours.postes.delegues) {
            if (delegue.personnalite_id) {
                tousLesPostes.push({
                    gouvernement_id: gouvernementId,
                    type: 'delegue',
                    personnalite_id: delegue.personnalite_id,
                    fonction_delegue: delegue.fonction,
                    ministeres_rattachement: delegue.ministeres_rattachement,
                    ordre: ordre++
                });
            }
        }

        if (tousLesPostes.length > 0) {
            const { error: postesError } = await supabase
                .from('postes_gouvernement')
                .insert(tousLesPostes);
            
            if (postesError) throw postesError;
        }

        // 4. TODO: Gérer les relations secteurs fusionnés et sous-secteurs

        // Succès
        const message = publier 
            ? '✅ Gouvernement publié avec succès !' 
            : '✅ Brouillon sauvegardé !';
        
        alert(message);

        if (publier) {
            // Rediriger vers la liste des gouvernements publiés
            // TODO: Implémenter la navigation
        }

    } catch (error) {
        console.error('❌ Erreur sauvegarde gouvernement:', error);
        alert('❌ Erreur lors de la sauvegarde. Veuillez réessayer.');
    }
}

// ================================================================
// EXPORTS
// ================================================================

export {
    gouvernementEnCours,
    cache as cacheGouvernement
};
