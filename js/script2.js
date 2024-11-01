// Définissez DEBUG sur true pour activer le débogage, sinon sur false
const DEBUG = false; // ou false pour désactiver

function debugLog(...args) {
    if (DEBUG) {
        // Créez une erreur pour obtenir la stack trace
        let e = new Error();
        let stack = e.stack.split('\n');
        let caller_line = stack[2].trim();
        let index = caller_line.indexOf("at ");
        let lineInfo = caller_line.slice(index + 3, caller_line.length);

        // Prendre le premier argument comme message principal si c'est une chaîne
        let message = args[0];
        if (typeof message === 'string') {
            // Loguer le premier argument comme message, et le reste comme JSON s'ils sont des objets
            console.log(`[DEBUG ${new Date().toISOString()} from ${lineInfo}]: ${message}`);
            for (let i = 1; i < args.length; i++) {
                if (typeof args[i] === 'object') {
                    console.log(JSON.stringify(args[i], null, 2));
                } else {
                    console.log(args[i]);
                }
            }
        } else {
            // Si le premier argument n'est pas une chaîne, loguer chaque argument
            args.forEach(arg => {
                if (typeof arg === 'object') {
                    console.log(`[DEBUG ${new Date().toISOString()} from ${lineInfo}]:`, JSON.stringify(arg, null, 2));
                } else {
                    console.log(`[DEBUG ${new Date().toISOString()} from ${lineInfo}]: ${arg}`);
                }
            });
        }
    }
}

function initModificationListeners() {
const items = document.querySelectorAll('.modification-item');
    let currentOpenDetails = null;
	
	// Sélectionnez tous les liens avec la classe 'modification-link'
    document.querySelectorAll('.modification-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // Empêcher le comportement par défaut du lien
            
            var file = this.getAttribute('data-file');
            var plugin = this.getAttribute('data-plugin');
            var time = this.getAttribute('data-time');

            // Création d'une requête AJAX
            var xhr = new XMLHttpRequest();
            xhr.open('GET', ajaxurl + '?action=download_file_modification&file=' + encodeURIComponent(file) + '&plugin_name=' + encodeURIComponent(plugin) + '&time=' + encodeURIComponent(time), true);
            xhr.responseType = 'blob';

            xhr.onload = function() {
                if (xhr.status === 200) {
                    // Création d'un lien de téléchargement temporaire
                    var a = document.createElement('a');
                    a.href = window.URL.createObjectURL(xhr.response);
                    a.download = file.split('/').pop(); // Nom du fichier à partir du chemin
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    // Nettoyage après téléchargement
                    window.URL.revokeObjectURL(a.href);
                    document.body.removeChild(a);
                } else {
                    console.error('Erreur lors du téléchargement du fichier.');
                }
            };
            
            xhr.send();
        });
    });

    items.forEach(item => {
        item.addEventListener('click', async (event) => {
            if (event.target.tagName === 'A' && event.target.getAttribute('href')) {
                return; // Permet au lien de fonctionner normalement
            }
            event.preventDefault();
            if (event.target.closest('.modification-content')) return; // Prevent click if already inside content

            const time = item.getAttribute('data-time');
            const pluginName = item.getAttribute('data-plugin');
            const file = item.getAttribute('data-file');
            let detailsContainer = item.querySelector('.modification-content');

            if (currentOpenDetails === detailsContainer && detailsContainer.style.display === 'block') {
				detailsContainer.classList.remove('show');
                //detailsContainer.style.display = 'none';
                detailsContainer.innerHTML = "";
                currentOpenDetails = null;
            } else {
                if (currentOpenDetails) { currentOpenDetails.classList.remove('show');
										 currentOpenDetails.innerHTML = "";
										}
                detailsContainer.style.display = 'block';
                detailsContainer.classList.add('show');
                if (!detailsContainer.innerHTML) {
                    try {
                        await loadModificationContent(time, pluginName, file, detailsContainer);
                    } catch(error) {
                        console.error('Failed to load modification content:', error);
						detailsContainer.classList.remove('show');
                    }
                }
                currentOpenDetails = detailsContainer;
            }
        });
    });
}

function loadModificationContent(time, pluginName, file) {
    jQuery.post(
        ajaxurl,
        {
            'action': 'load_modification_content',
            'time': time,
            'plugin_name': pluginName,
            'file': file
        },
        function(response) {
            if (typeof Diff2Html === 'undefined') {
                console.error('diff2html is not loaded');
                return;
            }
            var realTime = time.replace(/ /g, ' ').replace(/:/g, ':'); // Assure que les espaces et deux-points restent tels quels
			var selector = 'modification-content-' + realTime;
			var res = document.getElementById(selector);
            //var diffContainer = document.getElementById('diff-container-' + time.replace(/[^a-zA-Z0-9]/g, '_'));
            if (!res) {
                console.error('Diff container not found');
                return;
            }
			
			// Assurez-vous que response contient bien modified_characters_json
            var responseObj = JSON.parse(response);
            var originalLines = JSON.parse(responseObj.modified_characters_json);debugLog("origin: " , originalLines);
			//console.log("ORIGINAK BEFORE VERIDy STRING");console.log(typeof originalLines);console.log(originalLines);
			if (originalLines) {
    debugLog(typeof originalLines);
    
    if (typeof originalLines === 'object' && originalLines !== null) {
        // Vérification si c'est un tableau ou un objet
        if (Array.isArray(originalLines)) {
            // Si c'est déjà un tableau, on peut continuer avec le traitement
        } else {
            // Convertir l'objet en un tableau de ses valeurs
            originalLines = Object.values(originalLines);
            if (!originalLines.length) {
                console.log('L\'objet ne contient pas de lignes de texte.');
                originalLines = []; // Ou traiter selon vos besoins
            }
        }
    } else if (typeof originalLines === 'string') {
        // Cas où originalLines serait une string après tout, on split sur les retours à la ligne
        originalLines = originalLines.split('\n');
    } else {
        console.log('Type de données inattendu pour originalLines:', typeof originalLines);
        originalLines = []; // Initialisation par défaut ou traitement d'erreur
    }
} else {
    console.log('Aucune donnée n\'a été trouvée ou une erreur est survenue lors du parsing.');
    originalLines = []; // Initialisation vide en cas d'absence de données
}
			/*if (originalLines) {debugLog(typeof originalLines);
				if (typeof originalLines === 'string') {
					//console.log("AZERTYZERTY");
    originalLines = originalLines.split('\n');
} else {
    console.log('Ceci est probablement une version où le contenu original n\'existait pas ou une erreur est survenue.');
    // Ici, vous pouvez décider de ce qu'il faut faire si originalLines n'est pas une string
    // Par exemple, initialiser originalLines comme un tableau vide ou gérer l'erreur d'une autre manière.
    originalLines = []; // Initialisation comme tableau vide ou tout autre traitement
}
				}*/

			function getOriginalLine(lineNum) {
				
    // Vérifie si originalLines est défini et est bien un tableau
    if (!Array.isArray(originalLines) || lineNum < 1) {
        return ''; // Retourne une chaîne vide si le tableau n'existe pas ou si lineNum est invalide
    }
    // Vérifie si l'index est dans les bornes du tableau
    return (lineNum - 1 < originalLines.length) ? (originalLines[lineNum - 1] || '') : '';
}
            /*function getOriginalLine(lineNum) {
                return originalLines[lineNum - 1] || null; // -1 car JavaScript utilise un index 0
            }*/
			
			function decodeHtmlEntities(encodedStr) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = encodedStr;
    return textarea.value;
}
			
function myersDiff(a, b) {
    function shortestEdit(a, b) {
    let n = a.length;
    let m = b.length;
    let max = n + m;
    let v = {1: 0};
    let trace = [];

    for (let d = 0; d <= max; d++) {
        // Créer une copie de l'objet v au lieu d'utiliser {...v}
        let vCopy = Object.assign({}, v);
        trace.push(vCopy);
        for (let k = -d; k <= d; k += 2) {
            let x = (k === -d || (k !== d && v[k-1] < v[k+1])) ? v[k+1] : v[k-1] + 1;
            let y = x - k;
            while (x < n && y < m && a[x] === b[y]) {
                x++;
                y++;
            }
            v[k] = x;
            if (x >= n && y >= m) {
                return trace;
            }
        }
    }
    throw new Error("Ne devrait pas arriver");
}

    function backtrack(trace, a, b) {
        let x = a.length;
        let y = b.length;
        let path = [];
        for (let d = trace.length - 1; d >= 0; d--) {
            let v = trace[d];
            let k = x - y;
            let prev_k = (k == -d || (k != d && v[k-1] < v[k+1])) ? k + 1 : k - 1;
            let prev_x = v[prev_k];
            let prev_y = prev_x - prev_k;

            while (x > prev_x && y > prev_y) {
                path.push({type: "context", line: a[x-1]});
                x--;
                y--;
            }

            if (d > 0) {
                if (x > prev_x) {
                    path.push({type: "deleted", line: a[x-1]});
                    x--;
                } else if (y > prev_y) {
                    path.push({type: "added", line: b[y-1]});
                    y--;
                }
            }
        }
        return path.reverse();
    }

    let trace = shortestEdit(a, b);
    return backtrack(trace, a, b);
}
			
function convertToUnifiedDiff(response, getOriginalLine, contextSize) {
    // Extraction du nom de fichier
    let fileName = file.replace(/^.*[\\/]/, '');

    // Génération des en-têtes du diff unifié
    let unifiedDiff = `--- a/${fileName}\t${realTime}\n+++ b/${fileName}\t${realTime}\n`;

    //const contextSize = 3 - 3; // Nombre de lignes de contexte
    debugLog("BEFORE CONTEXT: ", response);
    // Ajouter le contexte ici, avant le tri
    response = addContext(response, getOriginalLine, contextSize);
	debugLog("AFTER CONTEXT: ", response);

	function addContext(response, getOriginalLine, contextSize) {
    const withContext = [];
    const originalLines = new Set();

    const addContextLines = (lineNumber, isBefore, limitCheckFunc) => {
    const direction = isBefore ? -1 : 1;
    for (let i = 1; i <= contextSize; i++) {
        const contextLineNum = lineNumber + direction * i;
        if (contextLineNum <= 0) break; // Avoid going below line 1
        
        if (limitCheckFunc && limitCheckFunc(contextLineNum)) break;

        const isChangeLine = response.some(change => change.line_number === contextLineNum);
		//const isContextLine = withContext.some(context => context.line_number === contextLineNum);
        if (!isChangeLine) { // && !isContextLine) { // Ne pas ajouter de contexte pour les lignes de changement
            let contextLine = getOriginalLine(contextLineNum) || "\n";
			if (!withContext.some(existing => 
    existing.line_number === contextLineNum &&
    existing.original_line === contextLine &&
    existing.modified_line === contextLine
)) {
            withContext.push({
                line_number: contextLineNum,
                original_line: contextLine,
                modified_line: contextLine,
            });
			}
        }
    }
};

    for (let change of response) {
        let lineNumber = change.line_number;

        // Ajout du contexte avant
        addContextLines(lineNumber, true);

        // Ajout de la ligne de changement
        withContext.push(change);
        if (change.original_line && !originalLines.has(lineNumber)) {
            originalLines.add(lineNumber);
        }

        // Ajout du contexte après
        const currentIndex = response.indexOf(change);
        const nextChangeLine = currentIndex + 1 < response.length ? response[currentIndex + 1].line_number : Infinity;
        addContextLines(lineNumber, false, (nextLineNumber) => nextLineNumber >= nextChangeLine);
    }

    return withContext;
}
/*function addContext(response, getOriginalLine, contextSize) {
    const withContext = [];
    const originalLines = new Set();

    // Fonction pour ajouter le contexte
    const addContextLines = (lineNumber, isBefore, limitCheckFunc) => {
        const direction = isBefore ? -1 : 1;
		const isDeletedLine = (lineNum) => {
			debugLog("isDeleted");
    const line = findLineByTypeAndNumber("original_line", lineNum, response);
			debugLog(line);
    return line && !findLineByTypeAndNumber("modified_line", lineNum, response);
};

        for (let i = 1; i <= contextSize; i++) {
            const contextLineNum = lineNumber + direction * i;
            if (contextLineNum <= 0) break; // Ne pas descendre en dessous de la ligne 1
			debugLog("ContextLineNum: ", contextLineNum);          
            if (limitCheckFunc && limitCheckFunc(contextLineNum - contextSize)) break;

            let contextLine = getOriginalLine(contextLineNum);
			debugLog("New Xontext Line to add: ", contextLine);
			contextLine = contextLine ? contextLine : "\n";
            if (contextLine && !isDeletedLine(contextLineNum)) {//!originalLines.has(contextLineNum)) {
				debugLog("Added !");
                withContext.push({
                    line_number: contextLineNum,
                    original_line: contextLine,
                    modified_line: contextLine,
                });
                //originalLines.add(contextLineNum);
            }
        }
    };

    for (let change of response) {
        let lineNumber = change.line_number;

        // Ajout du contexte avant
        addContextLines(lineNumber, true);

        // Ajout de la ligne de changement
        withContext.push(change);
        if (change.original_line) {
            originalLines.add(change.line_number);
        }

        // Ajout du contexte après
        const currentIndex = response.indexOf(change);
        addContextLines(lineNumber, false, (nextLineNumber) => {
			let toto = "toto";
			try {
			toto = response[currentIndex + 1].line_number;// === undefined ? 'undefined' : response[currentIndex + 1].line_number;
			}
			catch (e) {
				toto = e;
				debugLog("Error: ", toto);
		}
			debugLog("addContextLines: ", currentIndex + 1, " ", nextLineNumber, " >= ", toto);
            return currentIndex < response.length - 1 && nextLineNumber >= response[currentIndex + 1].line_number;
        });
    }

    return withContext;
}*/

  /*  // Fonction pour ajouter le contexte
    function addContext(response, getOriginalLine, contextSize) {
        const withContext = [];
        let lastLine = 0;

        for (let change of response) {
            // Ajouter les lignes contextuelles manquantes avant le changement
            for (let i = 1; i <= contextSize && change.line_number - i > lastLine; i++) {
                const contextLine = getOriginalLine(change.line_number - i);
                if (contextLine) {
                    withContext.push({line_number: change.line_number - i, original_line: contextLine, modified_line: contextLine, type: "context"});
                    lastLine = change.line_number - i;
                }
            }

            // Ajouter la ligne de changement
            withContext.push(change);
            lastLine = change.line_number;

            // Ajouter le contexte après le changement
            for (let i = 1; i <= contextSize && lastLine + i <= (getOriginalLine(lastLine + i) ? getOriginalLine(lastLine + i).line_number : Infinity); i++) {
                const nextLine = getOriginalLine(lastLine + i);
                if (nextLine) {
                    withContext.push({line_number: lastLine + i, original_line: nextLine, modified_line: nextLine, type: "context"});
                }
            }
        }

        return withContext;
    }
*/
    // Trier les réponses par numéro de ligne après avoir ajouté le contexte
    response.sort((a, b) => a.line_number - b.line_number);
//console.log(response);
    // Convertir les changements en arrays de lignes avec numéro de ligne pour le référencement
    const originalWithNumbers = response.map(change => ({
        line: decodeHtmlEntities(change.original_line),
        line_number: change.line_number
    }));
    const modifiedWithNumbers = response.map(change => ({
        line: decodeHtmlEntities(change.modified_line),
        line_number: change.line_number
    }));

    debugLog("AZERTY");debugLog(modifiedWithNumbers);debugLog("QWERTY");debugLog(originalWithNumbers);

    // Appliquer l'algorithme de Myers pour obtenir le diff
    const diff = myersDiff(originalWithNumbers.map(item => item.line), modifiedWithNumbers.map(item => item.line));
debugLog("ouiiiiiiiii");debugLog(diff);
 // Création de enrichedDiff
let enrichedDiff = [];
let originalIndex = 0;
let modifiedIndex = 0;
//let lineNumbersAdded = new Set(); // Pour suivre les numéros de ligne déjà ajoutés
for (let change of diff) {
    let enrichedChange = {
        type: change.type,
        line: change.line,
        line_number: undefined // Temporairement undefined, sera défini ci-dessous
    };

    if (change.type === "deleted") {
        enrichedChange.line_number = originalWithNumbers[originalIndex] ? originalWithNumbers[originalIndex++].line_number : undefined;
		//lineNumbersAdded.add(enrichedChange.line_number);
    } else if (change.type === "added") {
        enrichedChange.line_number = modifiedWithNumbers[modifiedIndex] ? modifiedWithNumbers[modifiedIndex++].line_number : undefined;
		//lineNumbersAdded.add(enrichedChange.line_number);
    } else { // context
		/*if(modifiedIndex < modifiedWithNumbers.length) {
            const potentialLineNum = modifiedWithNumbers[modifiedIndex].line_number;
            if (!lineNumbersAdded.has(potentialLineNum)) {
                enrichedChange.line_number = potentialLineNum;
                modifiedIndex++;
                originalIndex++;
                lineNumbersAdded.add(potentialLineNum); // Ajoute le numéro de ligne aux numéros ajoutés
            } else {
                continue; // Saute cette ligne de contexte si le numéro existe déjà
            }
        }*/
        enrichedChange.line_number = modifiedWithNumbers[modifiedIndex] ? modifiedWithNumbers[modifiedIndex++].line_number : undefined;
        originalIndex++; // Pour garder les deux indices synchronisés dans le contexte
    }

    enrichedDiff.push(enrichedChange);
}
debugLog("enrichedDiff: " , enrichedDiff);	

	unifiedDiff = generateDiff(enrichedDiff, contextSize);

debugLog(unifiedDiff);
    return unifiedDiff;
}
		
function reorganizeFirstDuplicate(diffArray) {
    if (diffArray.length === 0) return diffArray;

    let firstItem = diffArray[0];
    let firstLineNumber = parseInt(firstItem.line_number);
    let duplicates = [];
    
    // Recherche des doublons
    for (let i = 1; i < diffArray.length; i++) {
        if (parseInt(diffArray[i].line_number) === firstLineNumber) {
            duplicates.push(diffArray.splice(i, 1)[0]);
            i--; // Décrémenter i car nous avons retiré un élément
			break ;
        }
    }
    
    // Insérer les doublons juste après le premier élément
    diffArray.splice(1, 0, ...duplicates);

    return diffArray;
}
			
		function generateDiff(diffArray, contextSize) {
			let contextLines = [];
    let fileName = file.replace(/^.*[\\/]/, '');
    let result = [
        `--- a/${fileName}\t${realTime}`,
        `+++ b/${fileName}\t${realTime}`
    ];
			debugLog("AVANT: ", diffArray);
diffArray = reorganizeFirstDuplicate(diffArray);
			debugLog("APRES: ", diffArray);
    //let currentLine = diffArray.length > 0 ? diffArray[0].line_number || 1 : 1; // Déterminer la ligne de départ
    let i = 0;
	let hunkInfo = "";
    while (i < diffArray.length) {
		        // Récupérer la ligne de départ pour le hunk actuel
        let currentLine = diffArray[i].line_number || 1;
		if (contextSize === 0) {
        	hunkInfo = generateHunk(diffArray, i, currentLine, contextSize);
		}
		else
			{
			hunkInfo = generateHunkWithContext(diffArray, i, currentLine, contextSize, contextLines);
			}
        if (hunkInfo.hunk.length > 0) {
            result.push(hunkInfo.hunk.join("\n"));
            //currentLine += hunkInfo.linesChanged;
            i += hunkInfo.changedLines;
        } else {
            i++; // Avancer si le hunk est vide
        }debugLog("HUNK INFO: ", hunkInfo);
    }
	/*if (contextSize !== 0) {
		let fileHeaders = result.slice(0, 2); // Conservez les headers
		 // Transformer les strings en objets pour la fusion
        let hunksForMerge = result.slice(2).map(hunkString => ({ 
            hunk: hunkString.split('\n') 
        }));
		debugLog("BEFORE MERGE: ", hunksForMerge);
        // Fusion des hunks ici
        hunksForMerge = mergeAdjacentHunks(hunksForMerge, contextSize);
		debugLog("AFTER MERGE: ", hunksForMerge);
        // Ajouter les hunks fusionnés au résultat final
        //let res = hunksForMerge.map(r => r.hunk.join("\n"));
		let res = fileHeaders.concat(hunksForMerge.map(r => r.hunk.join("\n")));
		debugLog("REEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEESSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS");
		debugLog(res);
        return res.join("\n") + "\n"; // Ajouter un saut de ligne entre chaque hunk
	}*/

    return result.join("\n") + "\n";
}
/*			
	function mergeAdjacentHunks(hunks, contextSize = 3) {
    debugLog(`Starting with ${hunks.length} hunks`);
    let mergedHunks = [hunks[0]];
    for (let i = 1; i < hunks.length; i++) {
        let lastHunk = mergedHunks[mergedHunks.length - 1];
        let currentHunk = hunks[i];
        
        debugLog(`Analyzing hunk index ${i}, currentStartLine: ${getStartLineFromHunk(currentHunk.hunk[0])}, lastEndLine: ${getEndLineFromHunk(lastHunk.hunk[0])}`);

        if (!currentHunk.hunk[0] || !lastHunk.hunk[0]) {
            console.error("Hunk header missing for merging", currentHunk, lastHunk);
            continue; // ou gérer cette situation d'erreur
        }

        let lastEndLine = getEndLineFromHunk(lastHunk.hunk[0]);
        let currentStartLine = getStartLineFromHunk(currentHunk.hunk[0]);

        debugLog(`Checking if ${currentStartLine} - ${lastEndLine} <= ${contextSize}`);
        if (currentStartLine - lastEndLine <= contextSize) {
            debugLog(`Merging hunks at index ${i}`);
            lastHunk.hunk = lastHunk.hunk.concat(currentHunk.hunk.slice(1)); // Exclure le header du hunk actuel
            
            let [lastStart, lastDeleted, lastAdded] = getHunkInfo(lastHunk.hunk[0]);
            let [, currentAdded] = getHunkInfo(currentHunk.hunk[0]);
            lastHunk.hunk[0] = `@@ -${lastStart},${lastDeleted + analyzeHunk(lastHunk.hunk, 0)} +${lastStart},${currentAdded + analyzeHunk(lastHunk.hunk, 1)} @@`;
            debugLog(`New header: ${lastHunk.hunk[0]}`);
        } else {
            debugLog(`Not merging: hunks are too far apart at index ${i}`);
            mergedHunks.push(currentHunk);
        }
    }
    debugLog(`Finished merging, resulting in ${mergedHunks.length} hunks`);
    return mergedHunks;
}

function getEndLineFromHunk(header) {
    let [, afterChange] = header.match(/@@ -\d+,\d+ \+(\d+),(\d+) @@/);
    let endLine = parseInt(afterChange, 10);
    debugLog(`End line from hunk: ${endLine}`);
    return endLine;
}

function getStartLineFromHunk(header) {
    let [, startLine] = header.match(/@@ -\d+,\d+ \+(\d+),(\d+) @@/);
    let start = parseInt(startLine, 10);
    debugLog(`Start line from hunk: ${start}`);
    return start;
}

function getHunkInfo(header) {
    let [, start, deleted, added] = header.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
    debugLog(`Hunk info - start: ${start}, deleted: ${deleted}, added: ${added}`);
    return [parseInt(start, 10), parseInt(deleted, 10), parseInt(added, 10)];
}

function analyzeHunk(hunkLines, countType) {
    let count = hunkLines.slice(1).reduce((acc, line) => {
        if (line.startsWith(countType === 1 ? '+' : '-')) acc++;
        return acc;
    }, 0);
    debugLog(`Analyzed hunk for ${countType === 1 ? 'additions' : 'deletions'}: ${count} lines`);
    return count;
}
*/			

/*			// Nouvelle fonction pour fusionner les hunks adjacents
    function mergeAdjacentHunks(hunks, contextSize = 3) {
    debugLog(`Starting with ${hunks.length} hunks`);
    let mergedHunks = [hunks[0]];
    debugLog(`Initialized mergedHunks with first hunk starting at line ${hunks[0].startLine}`);

	function analyzeHunk(hunkLines, fadded) {
        let added = 0, deleted = 0;
        for(let line of hunkLines.slice(1)) { // On saute le header
            if(line.startsWith("+")) added++;
            else if(line.startsWith("-")) deleted++;
        }
		if (fadded === 0)
			return deleted;
		return added;
        //return {added, deleted};
    }
    for (let i = 1; i < hunks.length; i++) {
        let lastHunk = mergedHunks[mergedHunks.length - 1];
        let currentHunk = hunks[i];debugLog(hunks[i]);
		let currentStartLine = currentHunk.startLine; //never defined
		let lastStartLine = lastHunk.startLine; //never defined
        if (typeof currentStartLine === 'undefined' && Array.isArray(currentHunk.hunk)) {
            let header = currentHunk.hunk[0];
            if (/^@@ -\d+,\d+ \+(\d+)/.test(header)) {
                currentStartLine = parseInt(header.match(/^@@ -\d+,\d+ \+(\d+)/)[1], 10);
            }
        }
		if (typeof lastStartLine === 'undefined' && Array.isArray(lastHunk.hunk)) {
            let header = lastHunk.hunk[0];
            if (/^@@ -\d+,\d+ \+(\d+)/.test(header)) {
                lastStartLine = parseInt(header.match(/^@@ -\d+,\d+ \+(\d+)/)[1], 10);
            }
        }
		let lastadded;let currentadded; let alstdeleted; let currentdeleted;
		if(typeof lastHunk.added === 'undefined' || typeof lastHunk.deleted === 'undefined') {
            //({added: lastHunk.added, deleted: lastHunk.deleted} = analyzeHunk(lastHunk.hunk));
            lastadded = analyzeHunk(lastHunk.hunk, 1);
			alstdeleted = analyzeHunk(lastHunk.hunk, 0);
        }
        if(typeof currentHunk.added === 'undefined' || typeof currentHunk.deleted === 'undefined') {
            //({added: currentHunk.added, deleted: currentHunk.deleted} = analyzeHunk(currentHunk.hunk));
            currentadded = analyzeHunk(currentHunk.hunk, 1);
			currentdeleted = analyzeHunk(currentHunk.hunk, 0);
        }

        
        debugLog(`Analyzing hunk ${i}: starts at ${currentStartLine}, last hunk ends ${lastStartLine +alstdeleted}`);

        // Vérifiez si le premier changement dans le hunk actuel est à moins de contextSize lignes du dernier changement dans le hunk précédent
        if (currentStartLine - (lastStartLine + alstdeleted) <= contextSize) {
            debugLog(`Merging: lines between ${currentStartLine - (lastStartLine + alstdeleted)} <= ${contextSize}`);
            lastHunk.hunk = lastHunk.hunk.concat(currentHunk.hunk.slice(1)); 
            debugLog(`Merging lines, new hunk length: ${lastHunk.hunk.length}`);
            
            lastadded += currentadded;
            alstdeleted += currentdeleted;
            debugLog(`Updated counts: added=${lastadded}, deleted=${alstdeleted}`);
            
            // Mettre à jour le header du hunk si nécessaire
            lastHunk.hunk[0] = `@@ -${lastStartLine},${alstdeleted} +${lastStartLine},${lastadded} @@`;
            debugLog("Updated hunk header");
        } else {
            debugLog(`Not merging: hunks are too far apart ${currentStartLine} ${lastStartLine} ${alstdeleted}`);
            mergedHunks.push(currentHunk);
            debugLog(`Added new hunk to mergedHunks, now ${mergedHunks.length} hunks`);
        }
    }
    debugLog(`Finished merging, resulting in ${mergedHunks.length} hunks`);
    return mergedHunks;
}
*/			
function addSubContext(diffArray, index, currentLine, hunk) {
    let nextNonChangeIndex = index + 1;
    while (nextNonChangeIndex < diffArray.length && ['added', 'deleted'].includes(diffArray[nextNonChangeIndex].type)) {
        nextNonChangeIndex++;
    }

    if (nextNonChangeIndex > index + 1) {
        let slice = diffArray.slice(index + 1, nextNonChangeIndex);
        // Tri de la sous-liste par line_number
        let sortedSlice = slice.sort((a, b) => a.line_number - b.line_number);
		debugLog("sorted slice: " , sortedSlice);
        return sortedSlice; // Retourne la sous-liste triée pour remplacer l'originale dans diffArray
    }

    return index + 1; // Si aucune sous-liste à trier, on retourne l'index suivant
}
		
function findLineByTypeAndNumber(type, lineNumber, diffArray, startIndex = 0) {
    for (let i = startIndex; i < diffArray.length; i++) {
        if (diffArray[i].type === type && diffArray[i].line_number === lineNumber) {
			debugLog("Line ", i, " Found: ", diffArray[i].line);
            return diffArray[i].line; // Retourne la ligne trouvée
        }
        // Si vous voulez vous assurer de ne chercher que dans un certain type de lignes, 
        // vous pourriez ajouter une condition pour sortir si le type change
    }
    return null; // Retourne null si aucune ligne ne correspond aux critères
}
			
function generateHunkWithContext(diffArray, startIndex, currentLine, contextSize, contextLines) {
    let hunk = [];
    let added = 0, deleted = 0;
	//let addedContext = 0;
    let changedLines = 0;
    //let contextLines = [];
	
    // Fonction interne pour ajouter du contexte
    function addContextLines(start, end, after, contextLines, sign = ' ') {
		 // Calculer la valeur max de contextLines si elle n'est pas vide
        const maxContextLineIndex = contextLines.length > 0 ? Math.max(...contextLines) : -1;
		if (after === 1)
			debugLog("ADD CONTEXT AFTER");
		else
			debugLog("ADD CONTEXT BEFORE");
        for (let i = start; i < end; i++) {
            let contextLine = findLineByTypeAndNumber("context", i, diffArray);
            if (contextLine && !contextLines.includes(i) &&  i > maxContextLineIndex) {
				debugLog("Line pushed ", contextLine);
                hunk.push(`${sign}${contextLine}`);
                contextLines.push(i);
				debugLog(hunk);
				//addedContext++;
            }
        }
		if (after === 1)
			debugLog("=========== END CONTEXT AFTER FOR THIS HUNK ===========");
		else
			debugLog("=========== END CONTEXT BEFORE FOR THIS HUNK ===========");
    }

    // Boucle pour créer le hunk
    while (startIndex < diffArray.length && (diffArray[startIndex].type === 'deleted' || diffArray[startIndex].type === 'added')) {
        let lineNum = diffArray[startIndex].line_number || currentLine;

        // Ajouter le contexte avant
        addContextLines(Math.max(1, lineNum - contextSize), lineNum, 0, contextLines);

        // Ajouter la ligne modifiée
        let sign = diffArray[startIndex].type === 'deleted' ? '-' : '+';
        hunk.push(`${sign}${diffArray[startIndex].line}`);
        diffArray[startIndex].type === 'deleted' ? deleted++ : added++;
        changedLines++;

        // Logique pour ajouter du contexte ou ajuster l'index après une modification
        /*if (startIndex + 1 < diffArray.length && diffArray[startIndex + 1].line_number > lineNum + 1) {
            // Appel fictif pour ajuster le contexte ou l'index, cela dépend de votre implémentation
            let result = addSubContext(diffArray, startIndex, lineNum, hunk, contextSize);
            if (Array.isArray(result)) {
                diffArray.splice(startIndex + 1, result.length, ...result);
                startIndex += result.length;
            } else {
                startIndex = result - 1; // -1 parce qu'on incrémente startIndex à la fin de la boucle
            }
        }*/

        // Avancer l'index ici pour éviter de rester coincé sur la même ligne
        startIndex++;

        // Ajouter le contexte après la ligne courante si elle n'existe pas ou si on n'est pas à la fin du tableau
        if (startIndex < diffArray.length) {
            let nextLineNum = diffArray[startIndex].line_number || lineNum + 1;
            addContextLines(lineNum + 1, Math.min(nextLineNum, lineNum + contextSize + 1), 1, contextLines);
        }
    }
	changedLines += contextSize;//addedContext;
    if (hunk.length === 0) return {hunk: [], changedLines: 0, linesChanged: 0};

    // Générer le header du hunk avec les informations de ligne
    let header = `@@ -${Math.max(currentLine - contextSize, 1)},${deleted} +${Math.max(currentLine - contextSize, 1)},${added} @@`;
    return {
        hunk: [header, ...hunk],
        changedLines,
        linesChanged: added + deleted
    };
}
		
			
function generateHunk(diffArray, startIndex, currentLine, getOriginalLine) {
    let hunk = [];
    let added = 0, deleted = 0;
    let changedLines = 0; // Compteur de lignes parcourues dans ce hunk

    for (; startIndex < diffArray.length && (diffArray[startIndex].type === 'deleted' || diffArray[startIndex].type === 'added'); startIndex++) {
        hunk.push(`${diffArray[startIndex].type === 'deleted' ? '-' : '+'}${diffArray[startIndex].line}`);
        diffArray[startIndex].type === 'deleted' ? deleted++ : added++;
        changedLines++;
		if (startIndex !== diffArray.length - 1 // remettre les bonnes lignes en ordre en cas de sub hunk
			&& (diffArray[startIndex + 1].line_number > diffArray[startIndex].line_number + 1))
			{
				let result = addSubContext(diffArray, startIndex, currentLine, getOriginalLine, hunk);
            if (Array.isArray(result)) {
                // Remplacer la portion de diffArray avec la nouvelle portion triée
                diffArray.splice(startIndex + 1, result.length, ...result);
                startIndex += result.length; // Avancer au-delà de la portion insérée
            } else {
                startIndex = result - 1; // Ajuster startIndex pour la prochaine itération
            }
			}
	//	   && Math.min(...diffArray.slice(startIndex + 1).map(({ line_number }) => line_number )) > diffArray[startIndex + 1].line_number))
	//		break;
    }
	debugLog("current hunk: line ");debugLog(currentLine);debugLog("del, add: ");debugLog(deleted + ", " + added);
    if (hunk.length === 0) return {hunk: [], changedLines: 0, linesChanged: 0};

    let header = `@@ -${currentLine},${deleted} +${currentLine},${added} @@`;
    return {
        hunk: [header, ...hunk],
        changedLines, // Nombre de lignes examinées
        linesChanged: added + deleted // Nombre de lignes réellement changées
    };
}

// Convertir la chaîne JSON en objet JavaScript
var responseObj = JSON.parse(response);
			/*var unifiedDiff = `
diff --git a/example b/example
index 1234..5678 100644
--- a/example
+++ b/example
@@ -1 +1 @@
-original line
+modified line
`;*/
	const contextSelect = document.getElementById('contextSelect');
let contextSize = parseInt(contextSelect.value, 10); // Initialisation avec la valeur par défaut

    if(contextSelect) {
        contextSelect.addEventListener('change', function() {
            contextSize = parseInt(this.value, 10); // Mise à jour de la taille du contexte
            // Vous pouvez ici déclencher le recalcul du diff ou d'autres actions si nécessaire
            const event = new CustomEvent('contextChanged', { detail: { context: contextSize } });
            document.dispatchEvent(event);
			var unifiedDiff = convertToUnifiedDiff(JSON.parse(responseObj.modified_content), getOriginalLine, contextSize);
			updateDiffDisplay(unifiedDiff);
        });
    }
			 var unifiedDiff = convertToUnifiedDiff(JSON.parse(responseObj.modified_content), getOriginalLine, contextSize);
			// Example of how you might test with a known diff
/*unifiedDiff = `--- old_file
+++ new_file
@@ -1 +1 @@
-old line
+new line`;*/
/*debugLog(unifiedDiff);*/function updateDiffDisplay(unifiedDiff) {
	debugLog(unifiedDiff);
            var diffOutput = Diff2Html.html(unifiedDiff, {
                drawFileList: true,
                matching: 'lines',
                outputFormat: 'side-by-side',
				highlight: true,
            });

            res.innerHTML = diffOutput;}updateDiffDisplay(unifiedDiff);
        }
    ).fail(function(jqxhr, textStatus, error) {
        var err = textStatus + ", " + error;
		var realTime = time.replace(/ /g, ' ').replace(/:/g, ':'); // Assure que les espaces et deux-points restent tels quels
			var selector = 'modification-content-' + realTime;
			var res = document.getElementById(selector);
        //var diffContainer = document.getElementById('diff-container-' + time.replace(/[^a-zA-Z0-9]/g, '_'));
        if (res) {
            res.innerHTML = "<p>Erreur: Impossible de charger le contenu.</p>";
        }
    });
}