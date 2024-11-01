<?php
  if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly
// Fonction pour récupérer les modifications par plugin
function simpleeditor_get_modifications_by_plugin($wpdb) {

    // Assurez-vous que la table existe
    $table_name = $wpdb->prefix . 'file_modifications';

    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        // La table n'existe pas, donc pas de modifications
        error_log('Table not found: ' . $table_name);
        return array();
    }

    // Requête pour récupérer les données
    $results = $wpdb->get_results("
        SELECT SUBSTRING_INDEX(file, '/', 1) AS plugin_name, COUNT(*) AS num_modifications
        FROM $table_name
        GROUP BY plugin_name
    ");

    return $results;
}

// Définition de la fonction simple_editor_control_page() avec des paramètres
function simpleeditor_control_page($modifications_by_plugin) {
    ob_start();
    ?>
    <div class="simple-editor-control-container">
        <div class="modifications-list">
            <h1><?php echo esc_html__('Simple Editor Control', 'simple-editor-control'); ?></h1>
            <p><?php echo esc_html__('Surveillance des modifications des fichiers via l\'éditeur de fichiers WordPress.', 'simple-editor-control'); ?></p>
            <ul class="plugins-list">
            <?php foreach ($modifications_by_plugin as $modification): ?>
                <li class="plugin-item">
                    <a href="#" class="plugin-details" data-plugin="<?php echo esc_attr(urlencode($modification->plugin_name)); ?>">
                        <?php echo esc_html($modification->plugin_name); ?>
                    </a>: <?php echo intval($modification->num_modifications); ?> 
                    <?php echo esc_html__('modifications', 'simple-editor-control'); ?>
                    <div class="plugin-details-container" style="display: none;"></div>
                </li>
            <?php endforeach; ?>
            </ul>
        </div>
        <div class="context-selector">
            <label for="contextSelect"><?php echo esc_html__('Select Context:', 'simple-editor-control'); ?></label>
            <select id="contextSelect" name="contextSelect">
                <option value="0">0 lines</option>
                <option value="3">3 lines</option>
                <option value="5">5 lines</option>
                <option value="10">10 lines</option>
                <option value="20">20 lines</option>
            </select>
        </div>
    </div>
    <?php
    $content = ob_get_clean();
    return $content;
}

// Fonction pour afficher la page
function simpleeditor_rendre_control_page() {
// Créez l'objet $wpdb en utilisant les variables DB
global $wpdb;
    // Récupère les données à afficher
    $modifications_by_plugin = simpleeditor_get_modifications_by_plugin($wpdb);

    // Crée le contenu HTML
    $page_content = simpleeditor_control_page($modifications_by_plugin, $wpdb);

    // Affiche un message si aucune modification n'est trouvée
    if (empty($page_content)) {
        echo '<p>' . esc_html__('Aucune modification de fichier détectée.', 'simple-editor-control') . '</p>';
        return;
    }
	$allow_html = array('select' => array(
		'id' => array(),
		'name' => array()
	),
					   'option' => array(
						   'value' => array()
					   ),
					   'label' => array(
						   'for' => array()
					   ),
					   'div' => array(
						   'class' => array()
					   ),
					   'li' => array(),
					   'ul' => array(),
					   'p' => array(),
					   'h1' => array(),
					   'a' => array(
					   'href' => array(),
						   'class' => array(),
						   'data-plugin' => array()
					   ),
					   );
    // Affiche le contenu HTML
    echo wp_kses($page_content, $allow_html);
}

// Ajoute un sous-menu dans Outils
function simpleeditor_control_menu() {
	 // Vérifier si l'utilisateur a la capacité de gérer les options
    if (!current_user_can('manage_options')) {
        return;
    }
	global $wpdb;
	// Validation et échappement des données provenant de $_POST['file']
	//$file = isset($_POST['file']) ? sanitize_text_field($_POST['file']) : 'Default File Name';
    add_submenu_page(
        'tools.php',
        esc_html__('Simple Editor Control', 'simple-editor-control'),
        esc_html__('Simple Editor Control', 'simple-editor-control'),
        'manage_options',
        'simple-editor-control',
            // Appelle la fonction qui affiche la page en passant le nom du fichier
            'simpleeditor_rendre_control_page'
        //'render_simple_editor_control_page' // Appelle la fonction qui affiche la page
    );
// Vérifie si le paramètre 'plugin' est présent dans l'URL
    if (isset($_GET['plugin']) || isset($_GET['theme'])) {
		// Validation et échappement des données provenant de $_GET['plugin']
		$plugin_name = isset($_GET['plugin']) ? sanitize_text_field($_GET['plugin']) : sanitize_text_field($_GET['theme']);
        simpleeditor_control_plugin_details(explode('/', $plugin_name)[0], $wpdb);
    }
}
add_action('admin_menu', 'simpleeditor_control_menu', 10);
