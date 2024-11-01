<?php
  if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly 
add_action('admin_init', 'simpleeditor_before_capture_editor_page_url', 10);

function simpleeditor_before_capture_editor_page_url(){
	if ( WP_Filesystem() ) {
		global $wp_filesystem;

    // Définir $wp_filesystem en tant que variable globale
    $GLOBALS['wp_filesystem'] = $wp_filesystem;
		simpleeditor_capture_editor_page_url();
	}
}

/*// Ajoutez cette ligne pour capturer l'URL avant que l'éditeur n'apparaisse
add_filter('admin_url', 'simpleeditor_capture_editor_url_before_edit', 10, 3);

function simpleeditor_capture_editor_url_before_edit($url, $path, $blog_id){
    if(strpos($path, 'plugin-editor.php') !== false || strpos($path, 'theme-editor.php') !== false){
        simpleeditor_capture_editor_page_url(); // Appelez votre fonction ici pour capturer l'URL
    }
    return $url;
}
*/
function simpleeditor_before_simple_editor_control_track_changes(){
	if ( WP_Filesystem() ) {
		global $wp_filesystem;

    // Définir $wp_filesystem en tant que variable globale
    $GLOBALS['wp_filesystem'] = $wp_filesystem;
		simpleeditor_control_track_changes();
	}
}

function simpleeditor_capture_editor_page_url() {

    if (isset($_GET['plugin']) || isset($_GET['theme'])) {
        // Déterminer si c'est un plugin ou un thème
        $is_plugin = isset($_GET['plugin']);
		$GLOBALS['is_plugin'] = $is_plugin;
	$file_path = $is_plugin ? sanitize_text_field($_GET['plugin']) : sanitize_text_field($_GET['theme']);
	$theme_path = $file_path;
        if (isset($_GET['page'])){
			$is_plugin = isset($_GET['plugin']);
        $file_path = $is_plugin ? sanitize_text_field($_GET['plugin']) : sanitize_text_field($_GET['theme']);
		 $file_path .= '/' . $file_path . '.php'; // oui je sais pas trop
		}
		if (isset($_GET['file'])){
				$file_path = sanitize_text_field($_GET['file']);
		}
		$temp_file_content = "";
		if ($is_plugin) {
        $temp_file_content = file_get_contents(WP_PLUGIN_DIR . '/' . $file_path); // Récupère le contenu du fichier
		}
		else {
			$theme_dir = get_theme_root($file_path);
			$file_path = $theme_path . '/' . $file_path;
			$temp_file_content = file_get_contents($theme_dir . '/' . $file_path);
		}
		$new_file_path = explode('/', $file_path);
		$new_file_path = implode(".", $new_file_path);
				if (!file_exists(get_temp_dir() . 'simple-editor-control_files/')) {
    wp_mkdir_p(get_temp_dir() . 'simple-editor-control_files/', 0777, true);
}
        $temp_file_path = get_temp_dir() . 'simple-editor-control_files/'. $new_file_path . '.tmp'; // Crée le chemin du fichier temporaire avec le nom de base du fichier
		//error_log(($temp_file_path));
		if ( isset( $GLOBALS['wp_filesystem'] ) ) {
        $GLOBALS['wp_filesystem']->put_contents($temp_file_path, $temp_file_content); // Enregistre une copie du fichier temporaire
		}
    }
}

function simpleeditor_extract_plugin_name_from_file_path($file){
	
// Obtenez le chemin relatif du fichier par rapport au répertoire des plugins
$relative_path = plugin_basename($file);

// Extraire le nom du répertoire du chemin relatif
$plugin_name = dirname($relative_path);
//error_log($plugin_name);
// Supprimer les répertoires parents du nom du plugin
$plugin_name = trim($plugin_name, '/\\');
$plugin_name = explode('/', $plugin_name)[0];error_log($file);
	return $plugin_name;
	
}

function simpleeditor_calculate_diff($original_content, $modified_content) {
    $original_lines = explode("\n", $original_content);
    $modified_lines = explode("\n", $modified_content);
    $diff = array();

    $line_count = max(count($original_lines), count($modified_lines));
    for ($i = 0; $i < $line_count; $i++) {
        $original_line = $original_lines[$i] ?? '';
        $modified_line = $modified_lines[$i] ?? '';

        if ($original_line !== $modified_line) {
            $diff[] = array(
                'line_number' => $i + 1,
                'original_line' => $original_line,
                'modified_line' => $modified_line,
            );
        }
    }

    return $diff;
}

// Fonction pour enregistrer les modifications de fichiers
function simpleeditor_control_track_changes() {
    if (is_user_logged_in() && current_user_can('manage_options')) {
        if (isset($_POST['action']) && ($_POST['action'] == 'edit-theme-plugin-file')) {
			// Vérifier le nonce
			$verify_nonce = isset($_POST['file']) ? sanitize_text_field($_POST['file']) : ''; 
			// Vérifier si le fichier appartient à un plugin ou un thème
    if (isset($_POST['plugin'])) {
        // C'est un fichier de plugin
        $nonce_action = 'edit-plugin_' . $verify_nonce;
    } elseif (isset($_POST['theme'])) {
        // C'est un fichier de thème
        $nonce_action = 'edit-theme_' . sanitize_text_field($_POST['theme']) . '_' . $verify_nonce;
    }
            if (isset($_POST['nonce']) && wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), $nonce_action)) {
            global $wpdb;
			$allow_html = array(
				//"\n" => array()
				/*
    'br' => array(),
    'p' => array(),
    'a' => array(
        'href' => array(),
        'title' => array()
    ),
    'span' => array(),
    'strong' => array(),
    'em' => array(),
    'ul' => array(),
    'ol' => array(),
    'li' => array(),
    'blockquote' => array(),
    'code' => array(),
    'pre' => array(),
    'img' => array(
        'src' => array(),
        'alt' => array(),
        'title' => array()
    ),
    'h1' => array(),
    'h2' => array(),
    'h3' => array(),
    'h4' => array(),
    'h5' => array(),
    'h6' => array() */
);
            $user_id = get_current_user_id();
            $file = isset($_POST['file']) ? sanitize_text_field($_POST['file']) : '';
            $modified_content = isset($_POST['newcontent']) ? wp_kses(htmlspecialchars(wp_unslash($_POST['newcontent']), ENT_QUOTES, 'UTF-8'), $allow_html) : '';
            // Obtenir le nom du plugin à partir du chemin du fichier
            $plugin_name = simpleeditor_extract_plugin_name_from_file_path($file);
			if (isset($_POST['theme'])) {$plugin_name = sanitize_text_field($_POST['theme']); $file = $plugin_name . '/' . $file;}
            
            // Remplacer les slash '/' par des points '.' dans le nom du fichier
            $new_file_path = str_replace('/', '.', $file);
            if ( isset( $GLOBALS['wp_filesystem'] ) ) {
            // Obtenir le contenu original du fichier
            $original_content = wp_kses ( htmlspecialchars($GLOBALS['wp_filesystem']->get_contents(get_temp_dir() . 'simple-editor-control_files/' . $new_file_path . '.tmp'), ENT_QUOTES, 'UTF-8'), $allow_html ) ;
			}
            // Comparer le contenu original et modifié pour détecter les modifications
            similar_text($original_content, $modified_content, $percent);

if ($percent < 100) {
    // Calculer les différences entre les deux contenus
    $diff = simpleeditor_calculate_diff($original_content, $modified_content);

    $table_name = $wpdb->prefix . 'file_modifications';

// Trouver l'entrée avec la date de modification la plus ancienne
$min_date_entry = $wpdb->get_row($wpdb->prepare(
    "SELECT * FROM {$table_name} 
     WHERE file = %s AND plugin_name = %s 
     AND modification_time = (
         SELECT MIN(modification_time) 
         FROM {$table_name} 
         WHERE file = %s AND plugin_name = %s
     )",
    $file, $plugin_name, $file, $plugin_name
));

if ($min_date_entry && (is_null($min_date_entry->modified_characters_json) || $min_date_entry->modified_characters_json == '')) {
    // Mettre à jour l'entrée de base uniquement si original_content est vide ou nul
    $wpdb->update(
        $table_name,
        array(
            'modified_characters_json' => wp_json_encode($original_content),
        ),
        array('id' => $min_date_entry->id),
        array('%s'),
        array('%d')
    );
}

// Toujours insérer une nouvelle entrée pour le diff, qu'une mise à jour ait eu lieu ou non
$wpdb->insert(
    $table_name,
    array(
        'user_id' => $user_id,
        'file' => $file,
        'plugin_name' => $plugin_name,
        'modified_characters_json' => (is_null($min_date_entry) || empty($min_date_entry->modified_characters_json)) ? wp_json_encode($original_content) : '', // Seulement si c'est la première fois ou s'il n'y a pas encore de contenu original
        'modified_content' => wp_json_encode($diff),
        'modification_time' => current_time('mysql'),
    )
);
}

			// Suppression du fichier temporaire après le traitement
			/*$temp_file_path = get_temp_dir() . 'simple-editor-control_files/' . $new_file_path . '.tmp';
			unlink($temp_file_path);*/
			}
        }
    }
}

function convertFilePathToEditorURL($relativeFilePath, $pluginFileName) {
	$isPlugin = false;
        $pluginBasename = plugin_basename($relativeFilePath);
		$isPlugin = file_exists(WP_PLUGIN_DIR . '/' . $pluginBasename);
	$base = $isPlugin ? '/wp-admin/plugin-editor.php?file=' : '/wp-admin/theme-editor.php?file=';
	$middle = $isPlugin ? urlencode($relativeFilePath) : urlencode(str_replace($pluginFileName .'/', '', $relativeFilePath)); 
	$plugin_theme = $isPlugin ? '&plugin=' : '&theme=';
	$ending = $isPlugin ? urlencode(str_replace('.php', '', $pluginFileName)) . '/' . urlencode(str_replace('.php', '', $pluginFileName)) . '.php' : $pluginFileName;
    $path = $base . 
           $middle . 
           $plugin_theme .
		$ending;
	return $path;
}


function simpleeditor_control_plugin_details($plugin_name, $wpdb) {
    global $is_plugin; // Assurez-vous que cette variable est définie globalement ou passez-la comme paramètre si nécessaire
    $table_name = $wpdb->prefix . 'file_modifications';
    $results = $wpdb->get_results(
        $wpdb->prepare("
            SELECT modification_time, file
            FROM $table_name
            WHERE plugin_name = %s
            ORDER BY modification_time DESC
        ", $plugin_name)
    );

    ob_start();
    ?>
    <div class="plugin-details-container simple-editor-control-details">
        <h2 class="plugin-title">Détails des modifications pour <span><?php echo esc_html($plugin_name); ?></span></h2>
        <ul class="modifications-list">
            <?php foreach ($results as $modification): ?>
                <li class="modification-item"
                    data-time="<?php echo esc_attr($modification->modification_time); ?>" 
                    data-plugin="<?php echo esc_attr($plugin_name); ?>" 
                    data-file="<?php echo esc_attr($modification->file); ?>">
                    <a id="download-<?php echo esc_attr($modification->modification_time); ?>" class="modification-link" data-file="<?php echo esc_attr($modification->file); ?>" data-plugin="<?php echo esc_attr($plugin_name); ?>" data-time="<?php echo esc_attr($modification->modification_time); ?>">
						<?php echo esc_html($modification->modification_time); ?>
					</a>
                    <div class="modification-file">
                        Fichier: 
                        <a href="<?php echo esc_url(convertFilePathToEditorURL($modification->file, $plugin_name)); ?>" target="_blank">
                            <?php echo esc_html($modification->file); ?>
                        </a>
                    </div>
                    <div class="modification-content" id="modification-content-<?php echo esc_attr($modification->modification_time); ?>"></div>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php
    $content = ob_get_clean();

    return $content;
}

// Ajoute une action pour enregistrer les modifications
add_action('wp_ajax_edit-theme-plugin-file', 'simpleeditor_before_simple_editor_control_track_changes', 1);
