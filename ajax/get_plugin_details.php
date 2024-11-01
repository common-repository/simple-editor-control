<?php
defined('ABSPATH') || exit;
// Assurez-vous que c'est une requête AJAX
if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {

    // Vérifiez si le paramètre 'plugin' est présent dans la requête
    if (isset($_GET['plugin']) || isset($_GET['theme'])) {
        // Récupérez le nom du plugin à partir de la requête
        $plugin_name = isset($_GET['plugin']) ? sanitize_text_field($_GET['plugin']) : sanitize_text_field($_GET['theme']);

        // Créez une nouvelle instance de la classe $wpdb (si nécessaire)
        global $wpdb;

        // Appelez la fonction simple_editor_control_plugin_details pour récupérer les détails du plugin
        $plugin_details_html = simpleeditor_control_plugin_details($plugin_name, $wpdb);

        // Retournez les détails du plugin sous forme de réponse AJAX
        echo wp_json_encode(array('plugin_details' => $plugin_details_html));
    } else {
        // Si le paramètre 'plugin' est manquant dans la requête, retournez une réponse d'erreur
        echo wp_json_encode(array('error' => 'Le nom du plugin est manquant dans la requête.'));
    }
} else {
    // Si ce n'est pas une requête AJAX, retournez une réponse d'erreur
    echo wp_json_encode(array('error' => 'Cette page ne peut être accédée directement.'));
}
?>
