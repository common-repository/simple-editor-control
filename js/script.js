document.addEventListener('DOMContentLoaded', function() {

    // Sélectionne tous les liens avec la classe "plugin-details"
    var pluginLinks = document.querySelectorAll('.plugin-details');

    // Parcourt tous les liens et ajoute un gestionnaire d'événements pour le clic
    pluginLinks.forEach(function(link) {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Empêche le comportement de lien par défaut

            var pluginName = this.getAttribute('data-plugin'); // Récupère le nom du plugin à partir de l'attribut de données
            var detailsContainer = this.nextElementSibling; // Sélectionne le conteneur des détails des modifications
			
			 // Fermer tous les autres accordéons
            pluginLinks.forEach(function(otherLink) {
                if (otherLink !== link) {
                    otherLink.nextElementSibling.style.display = 'none';
                }
            });

            // Vérifie si les détails des modifications sont déjà visibles
            if (detailsContainer.style.display === 'block') {
                detailsContainer.style.display = 'none'; // Masque les détails
            } else {
                detailsContainer.style.display = 'block'; // Affiche les détails
                // Si les détails ne sont pas chargés, chargez-les via l'API REST ici

                // Vérifie si les détails ont déjà été chargés
                if (!detailsContainer.innerHTML) {
                    // Charge les détails via l'API REST
                    fetch('/wp-json/simple-editor-control/v1/plugin-details/?plugin=' + pluginName)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok');
                            }
                            return response.json();
                        })
                        .then(data => {
                            // Restitue les détails dans le conteneur
                            detailsContainer.innerHTML = data.plugin_details;
							initModificationListeners();
                        })
                        .catch(error => {
                            console.error('Erreur lors du chargement des détails du plugin:', error);
                        });
                }
            }
        });
    });
});