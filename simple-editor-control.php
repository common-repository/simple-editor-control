<?php
/*
Plugin Name: Simple Editor Control
Author: tlloancy
Version: 3.0.0
Description: Surveillance des modifications des fichiers via l'éditeur de fichiers WordPress.
Requires at least: 4.0
Tested up to: 6.6.2
Requires PHP: 7.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: simple-editor-control
Domain Path: /languages
*/

// Exit if accessed directly
defined( 'ABSPATH' ) || exit;

// Hook pour le chargement du texte domain
add_action('plugins_loaded', 'simpleeditor_load_textdomain');

function simpleeditor_load_textdomain() {
    load_plugin_textdomain(
        'simple-editor-control', // Le domaine de texte
        false, 
        dirname( plugin_basename(__FILE__) ) . '/languages/' // Chemin vers le dossier des langues
    );
}

function simpleeditor_can_access_plugin_details() {
    return current_user_can('manage_options'); // Ou toute autre capacité selon vos besoins
}

add_action('rest_api_init', 'simpleeditor_register_plugin_details_route');

function simpleeditor_register_plugin_details_route() {
    register_rest_route('simple-editor-control/v1', '/plugin-details/', array(
        'methods' => 'GET',
        'callback' => 'simpleeditor_get_plugin_details_callback',
		'permission_callback' => '__return_true' // 'simpleeditor_can_access_plugin_details' // '__return_true' // Ceci rend la route publique
    ));
}

function apply_diff($content, $diff) {
	  if (!is_array($content)) {
        $content = str_split($content, 1); // Split string into array of characters if it's a string
    }
    foreach ($diff as $change) {
        $line_number = $change['line_number'] - 1;

        if ($change['original_line'] === '' && $change['modified_line'] !== '') {
            // Ajout d'une ligne
            array_splice($content, $line_number, 0, array($change['modified_line']));
        } elseif ($change['original_line'] !== '' && $change['modified_line'] === '') {
            // Suppression d'une ligne
            array_splice($content, $line_number, 1);
            // Ajuster les numéros de ligne pour les diffs suivants après une suppression
            foreach ($diff as &$future_change) {
                if ($future_change['line_number'] > $change['line_number']) {
                    $future_change['line_number']--;
                }
            }
        } elseif ($change['modified_line'] !== '') {
            // Modification ou ajout d'une ligne (si la ligne n'existait pas avant)
            $content[$line_number] = $change['modified_line'];
        }
        // Si modified_line est vide et qu'on est ici, c'est une erreur ou une ligne vide a été intentionnellement "modifiée"
    }
    return $content;
}

add_action('wp_ajax_download_file_modification', 'ajax_download_file_modification');

function ajax_download_file_modification() {
    global $wpdb;

    // Sécurité - Vérification de l'appel AJAX
    //check_ajax_referer('your_nonce_action', 'nonce');

    $time = isset($_GET['time']) ? sanitize_text_field($_GET['time']) : '';
    $plugin_name = isset($_GET['plugin_name']) ? sanitize_text_field($_GET['plugin_name']) : '';
    $file = isset($_GET['file']) ? sanitize_text_field($_GET['file']) : '';

    $table_name = $wpdb->prefix . 'file_modifications';
    error_log("Plugin: $plugin_name, File: $file");

    // Initial content
    $initial_entry = $wpdb->get_row($wpdb->prepare(
        "SELECT modified_characters_json
         FROM $table_name 
         WHERE file = %s AND plugin_name = %s
         AND modification_time = (SELECT MIN(modification_time) FROM $table_name WHERE file = %s AND plugin_name = %s)",
        $file, $plugin_name, $file, $plugin_name
    ));

    if (!$initial_entry) {
        error_log("Initial content not found for file: $file, plugin: $plugin_name");
        wp_send_json_error('Initial content not found.');
    }

    $current_content = json_decode($initial_entry->modified_characters_json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON decode error: " . json_last_error_msg());
        wp_send_json_error('Error decoding initial content.');
    }
	if (is_array($current_content))
    	$current_content = implode('', $current_content);

    // Modifications
    $modifications = $wpdb->get_results($wpdb->prepare(
        "SELECT modified_content 
         FROM $table_name 
         WHERE file = %s AND plugin_name = %s AND modification_time <= %s 
         ORDER BY modification_time ASC",
        $file, $plugin_name, $time
    ));

    foreach ($modifications as $modification) {
        $diff = json_decode($modification->modified_content, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($diff)) {
            error_log("JSON decode error on diff: " . json_last_error_msg());
            continue; // Skip this diff if there's an error
        }
        $current_content = apply_diff_on_string($current_content, $diff);
    }

    // Log final content
	$current_content = html_entity_decode($current_content, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    // Download preparation
    header('Content-Type: text/html');  // Changed to text/html
    header('Content-Disposition: inline');  // Changed to inline if you want to display in the browser, otherwise keep 'attachment'
    header('Content-Length: ' . strlen($current_content));

    // Output the content without escaping
    echo $current_content;

    // Ensure WordPress cleans up after the AJAX response
    wp_die('', '', array('exit' => true));
}

function apply_diff_on_string($content, $diff) {
    //error_log("Content before diff: " . $content);
    $lines = explode("\n", $content);
    $max_line = count($lines);

    foreach ($diff as $modification) {
        if (isset($modification['line_number'], $modification['modified_line'])) {
            $line_number = $modification['line_number'] - 1; // -1 because array is 0-indexed
            
            // If the line doesn't exist, expand the array with empty strings
            if ($line_number >= $max_line) {
                $lines = array_pad($lines, $line_number + 1, '');
                $max_line = $line_number + 1;
            }

            $lines[$line_number] = $modification['modified_line'];
        } else {
            error_log("Modification data incomplete for line: " . json_encode($modification));
        }
    }
    $content = implode("\n", $lines);
    //error_log("Content after diff: " . $content);
    return $content;
}
/*
function apply_diff_on_string($content, $diff) {
    error_log("Content before diff: " . $content);
    $lines = explode("\n", $content);
    foreach ($diff as $modification) {
        if (isset($modification['line_number'], $modification['modified_line'])) {
            $line_number = $modification['line_number'] - 1;
            if (isset($lines[$line_number])) {
                $lines[$line_number] = $modification['modified_line'];
            } else {
                error_log("Line number {$modification['line_number']} does not exist in content.");
                // Optionally, you could extend the array to accommodate this line
            }
        } else {
            error_log("Modification data incomplete for line: " . json_encode($modification));
        }
    }
    $content = implode("\n", $lines);
    error_log("Content after diff: " . $content);
    return $content;
}
*/
add_action('wp_ajax_load_modification_content', 'ajax_load_modification_content');

function ajax_load_modification_content() {
    global $wpdb;

    $time = sanitize_text_field($_POST['time']);
    $plugin_name = sanitize_text_field($_POST['plugin_name']);
    $file = sanitize_text_field($_POST['file']);

    $table_name = $wpdb->prefix . 'file_modifications';

    // Trouver l'entrée avec la date de modification la plus ancienne pour le contenu initial
    $initial_entry = $wpdb->get_row($wpdb->prepare(
        "SELECT modified_characters_json
         FROM $table_name 
         WHERE file = %s AND plugin_name = %s AND modification_time = (SELECT MIN(modification_time) FROM $table_name WHERE file = %s AND plugin_name = %s)",
        $file, $plugin_name, $file, $plugin_name
    ));

    if (!$initial_entry) {
        echo json_encode(array('error' => 'Initial content not found.'));
        wp_die();
    }

    $current_content = json_decode($initial_entry->modified_characters_json, true);

    // Récupérer toutes les modifications avant la date demandée
    $modifications = $wpdb->get_results($wpdb->prepare(
        "SELECT modified_content 
         FROM $table_name 
         WHERE file = %s AND plugin_name = %s AND modification_time < %s 
         ORDER BY modification_time ASC",
        $file, $plugin_name, $time
    ));

    // Appliquer chaque diff au contenu actuel
    foreach ($modifications as $modification) {
        $diff = json_decode($modification->modified_content, true);
        $current_content = apply_diff($current_content, $diff);
    }

    // Récupérer juste la modification à la date spécifiée
    $result_at_time = $wpdb->get_row($wpdb->prepare(
        "SELECT modified_content
         FROM $table_name
         WHERE plugin_name = %s AND modification_time = %s AND file = %s",
         $plugin_name, $time, $file
    ));

    if($result_at_time) {
        echo json_encode(array(
            'modified_characters_json' => json_encode($current_content),
            'modified_content' => $result_at_time->modified_content,
        ));
    } else {
        echo json_encode(array('modified_content' => $current_content));
    }
    wp_die();
}

/*
function ajax_load_modification_content() {
    $wpdb = $GLOBALS['wpdb'];

    $time = sanitize_text_field($_POST['time']);
    $plugin_name = sanitize_text_field($_POST['plugin_name']);
    $file = sanitize_text_field($_POST['file']);

    $table_name = $wpdb->prefix . 'file_modifications';
    $result = $wpdb->get_row($wpdb->prepare(
        "SELECT modified_content, modified_characters_json
         FROM $table_name
         WHERE plugin_name = %s AND modification_time = %s AND file = %s",
         $plugin_name, $time, $file
    ));
	if($result) {
   echo json_encode($result);//json_encode(array_merge(json_decode($result->modified_content, true),json_decode($result->modified_characters_json, true)));
} else {
    echo 'Content not found.';
}
	wp_die();
}
*/
function simpleeditor_get_plugin_details_callback($request) {
    $plugin_name = $request->get_param('plugin');

    // Vérifiez si le nom du plugin est fourni dans la requête
    if (empty($plugin_name)) {
        return new WP_Error('missing_parameter', 'Le nom du plugin est manquant dans la requête.', array('status' => 400));
    }
	global $wpdb;
    // Récupérez les détails du plugin en utilisant votre fonction existante
    $plugin_details_html = simpleeditor_control_plugin_details($plugin_name, $wpdb);

    // Retournez les détails du plugin sous forme de tableau JSON
    return array('plugin_details' => $plugin_details_html);
}

// Ajouter une action pour enregistrer le CSS
add_action('admin_enqueue_scripts', 'simpleeditor_control_load_styles', 10);

// Activation et désactivation du plugin
register_activation_hook( __FILE__, 'simpleeditor_control_create_table_hook' );
register_deactivation_hook( __FILE__, 'simpleeditor_control_drop_table_hook' );

// Inclure les fichiers nécessaires
require_once plugin_dir_path( __FILE__ ) . 'includes/simple-editor-control-menu.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/simple-editor-control-track-changes.php';

add_action('admin_enqueue_scripts', 'simpleeditor_enqueue_custom_script', 10);

function simpleeditor_enqueue_custom_script($hook) {
	if ($hook === "tools_page_simple-editor-control") {
    wp_enqueue_script('custom-script', plugin_dir_url(__FILE__) . 'js/script.js', array('jquery'), null, true);
    //wp_enqueue_script('custom-script', plugin_dir_url(__FILE__) . 'js/script.js', array('jquery'), null, true);
     // Enqueue diff2html
    wp_enqueue_script('diff2html', plugin_dir_url(__FILE__) . 'js/diff2html.min.js', array(), null, true);
    wp_enqueue_style('diff2html-style', plugins_url('/css/diff2html.min.css', __FILE__));
	 // Enqueue le script des écouteurs de modification
    wp_enqueue_script('modification-listeners', plugin_dir_url(__FILE__) . '/js/script2.js', array('custom-script', 'jquery', 'diff2html'), null, true);
	}
}

// Fonction pour charger le CSS
function simpleeditor_control_load_styles($hook) {
    // Enregistrer le fichier CSS
    if ($hook === "tools_page_simple-editor-control")
    wp_enqueue_style('custom-style', plugin_dir_url(__FILE__) . 'css/styles.css');
}

// Fonction de rappel pour créer la table lors de l'activation du plugin
function simpleeditor_control_create_table_hook() {
    if ( ! current_user_can( 'activate_plugins' ) ) {
        return;
    }
    
    global $wpdb;
    simpleeditor_control_create_table($wpdb);
}

// Fonction de rappel pour supprimer la table lors de la désactivation du plugin
function simpleeditor_control_drop_table_hook() {
    if ( ! current_user_can( 'activate_plugins' ) ) {
        return;
    }
    
    global $wpdb;
    simpleeditor_control_drop_table($wpdb);
}

// Fonction pour créer la table lors de l'activation du plugin
function simpleeditor_control_create_table($wpdb) {
    $table_name = $wpdb->prefix . 'file_modifications';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        user_id mediumint(9) NOT NULL,
        file varchar(255) NOT NULL,
        modified_content longtext NOT NULL,
        modification_time datetime DEFAULT CURRENT_TIMESTAMP,
        plugin_name varchar(255) NOT NULL,
        modified_characters_json TEXT NULL,
        PRIMARY KEY  (id)
    ) $charset_collate;";

    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
    dbDelta( $sql );
}

// Fonction pour supprimer la table lors de la désactivation du plugin
function simpleeditor_control_drop_table($wpdb) {
    $table_name = $wpdb->prefix . 'file_modifications';
    $sql = $wpdb->prepare(
        "DROP TABLE IF EXISTS %s",
        array($table_name)
    );
    $wpdb->query($sql);
}

// Appel de simple_editor_control_page pour générer la page
function simpleeditor_control_load_page() {
    global $wpdb;
    // Enregistrement du fichier CSS
    wp_enqueue_style( 'custom-style', plugin_dir_url( __FILE__ ) . 'css/styles.css' );
    echo wp_kses_post(simpleeditor_control_page(simpleeditor_get_modifications_by_plugin($wpdb), $wpdb));
}

// Affichage des détails des modifications pour un plugin spécifique si un plugin est spécifié dans l'URL
add_action('admin_menu', 'simpleeditor_control_menu', 10);

?>
