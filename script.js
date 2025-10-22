// script.js

// --- CONFIGURACIÓN DE RUTA Y DATOS ---
const RESPONSES_FOLDER = 'respuestas_sociograma_1EM-A/'; // Carpeta que contiene los JSON
let allStudentsData = {};
let allQuestions = [];
let studentNames = [];
let currentChart = null;
let currentDf = null; // DataFrame simulado para el análisis inverso

const GRAPHICAL_QUESTIONS = [
    '1_Recreo_Mas', '2_Recreo_Menos', '3_Trabajo_Mas', '4_Trabajo_Menos',
    '5_Molesta_Continuamente', '8_Companero_Solo', '10_Lider_Positivo_Quien'
];
const OPEN_RESPONSE_QUESTIONS = [
    '1.1_Explicacion_Recreo_Mas', '2.1_Explicacion_Recreo_Menos', 
    '3.1_Explicacion_Trabajo_Mas', '4.1_Explicacion_Trabajo_Menos', 
    '5.1_Bromas_Afectado'
];
const EXCLUDE_KEYS = [
    'RUT', 'Nombre', 'Curso', 'Nombre_Completo', 'ApellidoPaterno', 
    'ApellidoMaterno', 'Display_Name', '11_Comentarios_Adicionales'
];

// --- FUNCIONES DE UTILIDAD ---

function formatKey(key) {
    if (!key) return '';
    let formatted = key.replace(/_/g, ' ').replace(/q/g, 'Q');
    formatted = formatted.replace(/(\d)\s/g, '$1. ');
    return formatted.trim().charAt(0).toUpperCase() + formatted.slice(1);
}

function getSafeFileName(name) {
    // Genera un nombre de archivo seguro para buscar (asumiendo que contiene Nombre_RUT)
    return `${name.split(' ')[0].toUpperCase()}_${name.split('(')[1].replace(')', '')}_encuesta.json`;
}

// --- 1. LÓGICA DE CARGA DE DATOS ---

async function loadData() {
    try {
        // En un entorno de GitHub Pages o un servidor local, necesitamos saber todos los nombres de archivo
        // Como no podemos listar un directorio directamente en JS, requerimos que los JSON se carguen de alguna manera.
        
        // Asumiendo que has generado una lista de RUTs/Nombres desde el programa Python,
        // Aquí vamos a simular la carga basándonos en los datos incrustados del programa Python anterior
        
        const rutKeys = Object.keys(ALUMNOS_BASE_DATA); // Simula la lista de alumnos
        let records = [];

        // Esto fallará en GitHub Pages porque no puede listar archivos.
        // Para GitHub, DEBES CARGAR CADA ARCHIVO INDIVIDUALMENTE.
        
        // Simulación: crea la lista de nombres de archivo esperados
        const fileNames = rutKeys.map(rut => {
            const student = ALUMNOS_BASE_DATA[rut];
            const namePart = student.Nombre.split(' ')[0];
            return `${namePart.toUpperCase()}_${rut}_encuesta.json`;
        });


        // Intentar cargar archivos: Esto es un placeholder, ya que requiere un servidor
        // Para que esto funcione en tu máquina, deberás ejecutar un servidor web simple
        
        // **ESTA PARTE DEBE SER AJUSTADA PARA TU PROYECTO REAL EN GH-PAGES**
        // Por ahora, usaremos una lista simulada de archivos para mostrar la lógica
        const studentMapping = ALUMNOS_BASE_DATA; // Usamos los datos incrustados para mapear

        for (const [rutKey, student] of Object.entries(studentMapping)) {
            const fileName = `${student.Nombre.split(' ')[0].toUpperCase()}_${rutKey}_encuesta.json`;
            const filePath = RESPONSES_FOLDER + fileName;

            try {
                const response = await fetch(filePath);
                if (!response.ok) continue; // Si el archivo no existe, salta
                
                const data = await response.json();
                
                // Mantenemos la lógica de visualización que no incluye RUT en el nombre
                data.Display_Name = `${student.Nombre} ${student.ApellidoPaterno} ${student.ApellidoMaterno}`.trim();
                records.push(data);

            } catch (e) {
                console.warn(`No se pudo cargar o parsear ${filePath}:`, e);
            }
        }
        
        if (records.length === 0) {
            document.getElementById('metadata').innerText = "ERROR: No se encontraron respuestas. Asegúrate de que los archivos JSON estén en la carpeta 'respuestas_sociograma_1EM-A'.";
            return;
        }

        // --- Procesamiento de Datos (Simulando Pandas) ---
        
        // 1. Inicializar estructuras
        let tempDf = records; // Nuestro Array of Objects (simulación de DataFrame)
        allStudentsData = {};
        
        // 2. Llenar allStudentsData y obtener preguntas
        const firstRecordKeys = Object.keys(records[0]);
        allQuestions = firstRecordKeys.filter(key => !EXCLUDE_KEYS.includes(key));

        tempDf.forEach(record => {
            allStudentsData[record.Display_Name] = record;
        });

        // 3. Crear Menús
        createSidebarMenus();
        document.getElementById('metadata').innerText = `Curso: ${records[0].Curso || 'N/A'} | Respuestas cargadas: ${records.length}`;

        // Guardamos el "DataFrame" global para el análisis inverso
        currentDf = tempDf;


    } catch (error) {
        console.error("Fallo crítico en la carga de datos:", error);
        document.getElementById('metadata').innerText = "Fallo al cargar la aplicación. Revisa la consola.";
    }
}

// --- 2. LÓGICA DE INTERFAZ (UI) ---

function clearContent() {
    document.getElementById('plot-area').innerHTML = '<canvas id="main-chart"></canvas>';
    document.getElementById('text-area').innerHTML = '';
    document.getElementById('voters-detail').innerText = 'Votantes aparecerán aquí al hacer clic en una barra del gráfico.';
}

function createSidebarMenus() {
    const studentListDiv = document.getElementById('student-list');
    const questionListDiv = document.getElementById('question-list');
    
    // Lista de Estudiantes
    Object.keys(allStudentsData).sort().forEach(name => {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = name;
        link.onclick = () => showStudentDetail(name);
        studentListDiv.appendChild(link);
    });

    // Lista de Preguntas
    allQuestions.forEach(qKey => {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = formatKey(qKey);
        link.onclick = () => showQuestionSummary(qKey);
        questionListDiv.appendChild(link);
    });
}

// --- 3. VISTAS DE ANÁLISIS ---

function showStudentDetail(name) {
    clearContent();
    document.querySelector('#left-content h2').textContent = `Detalle de Respuestas: ${name}`;

    const record = allStudentsData[name];
    let detailHTML = '<h2>Detalle de Respuestas</h2><pre>';

    for (const key in record) {
        if (EXCLUDE_KEYS.includes(key) || key.includes('Apellido') || key === 'Nombre' || key === 'RUT') continue;

        const formattedKey = formatKey(key);
        let value = record[key];

        if (Array.isArray(value)) {
            value = value.join(', ');
        }
        
        detailHTML += `--- ${formattedKey} ---\n`;
        detailHTML += `${value}\n\n`;
    }
    detailHTML += '</pre>';
    document.getElementById('text-area').innerHTML = detailHTML;
}

function showQuestionSummary(qKey) {
    clearContent();
    document.querySelector('#left-content h2').textContent = `Análisis Global: ${formatKey(qKey)}`;
    document.getElementById('text-area').innerHTML = '';
    document.getElementById('plot-area').innerHTML = '<canvas id="main-chart"></canvas>';

    const isGraphical = GRAPHICAL_QUESTIONS.includes(qKey);
    const isOpened = OPEN_RESPONSE_QUESTIONS.includes(qKey);

    const { counts, dfExpanded } = getCountsAndExpandedDf(qKey);

    if (isGraphical) {
        renderChart(qKey, counts);
    } else if (isOpened) {
        renderOpenResponses(qKey, dfExpanded);
    } else {
        // Respuestas simples (Sí/No, etc.)
        renderSimpleCounts(counts);
    }
}

// --- 4. LÓGICA DE PROCESAMIENTO (Simulación Pandas) ---

function getCountsAndExpandedDf(qKey) {
    const df = currentDf;
    const isListColumn = Array.isArray(df[0][qKey]);
    let counts = new Map();
    let dfExpanded = [];

    if (isListColumn) {
        // Simular df.explode(qKey)
        let allSelections = [];
        df.forEach(record => {
            if (Array.isArray(record[qKey])) {
                record[qKey].forEach(item => {
                    allSelections.push(item);
                    dfExpanded.push({ Display_Name: record.Display_Name, [qKey]: item });
                });
            }
        });
        
        // Simular value_counts()
        counts = allSelections.reduce((acc, curr) => {
            acc.set(curr, (acc.get(curr) || 0) + 1);
            return acc;
        }, new Map());
        
    } else {
        // Selección simple
        df.forEach(record => {
            const item = record[qKey];
            counts.set(item, (counts.get(item) || 0) + 1);
            dfExpanded.push({ Display_Name: record.Display_Name, [qKey]: item });
        });
    }

    return { counts, dfExpanded };
}

// --- 5. LÓGICA DE RENDERIZADO DE VISTAS ---

function renderChart(qKey, counts) {
    const sortedCounts = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const labels = sortedCounts.map(item => item[0]);
    const data = sortedCounts.map(item => item[1]);

    const ctx = document.getElementById('main-chart').getContext('2d');
    
    if (currentChart) {
        currentChart.destroy();
    }

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Frecuencia de Selección',
                data: data,
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(41, 128, 185, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const i = elements[0].index;
                    const selectedOption = labels[i];
                    showVotersForOption(qKey, selectedOption);
                }
            },
            scales: {
                x: { beginAtZero: true, ticks: { precision: 0 } },
                y: { beginAtZero: true }
            }
        }
    });
}

function renderSimpleCounts(counts) {
    let html = '<h3>Conteo de Respuestas</h3><pre>';
    counts.forEach((count, option) => {
        html += `${option.padEnd(40)}: ${count}\n`;
    });
    html += '</pre>';
    document.getElementById('text-area').innerHTML = html;
}

function renderOpenResponses(qKey, dfExpanded) {
    let html = '<h3>Respuestas Abiertas y Autor</h3><pre>';
    html += `RESPUESTA COMPLETA (Max 80 chars)`.padEnd(85) + `| AUTOR\n`;
    html += `-`.repeat(120) + '\n';

    dfExpanded.forEach(record => {
        const respuesta = record[qKey] || '(Sin respuesta)';
        const autor = record.Display_Name;

        let remainingText = respuesta;
        let isFirstLine = true;

        while (remainingText.length > 0) {
            const line = remainingText.substring(0, 80);
            remainingText = remainingText.substring(80);

            if (isFirstLine) {
                html += `${line.padEnd(85)} | ${autor}\n`;
                isFirstLine = false;
            } else {
                html += `${line.padEnd(85)} |\n`;
            }
        }
        html += '\n'; // Espacio entre respuestas
    });

    html += '</pre>';
    document.getElementById('text-area').innerHTML = html;
}


// --- 6. ANÁLISIS INVERSO (Clic en Barra) ---

function showVotersForOption(qKey, selectedOption) {
    const { dfExpanded } = getCountsAndExpandedDf(qKey);

    const voters = dfExpanded
        .filter(record => record[qKey] === selectedOption)
        .map(record => record.Display_Name)
        .sort();

    let resultText = `OPCIÓN SELECCIONADA: '${selectedOption}' (TOTAL: ${voters.length})\n`;
    resultText += `================================================\n`;
    
    if (voters.length > 0) {
        voters.forEach(name => {
            resultText += `- ${name}\n`;
        });
    } else {
        resultText += "No se encontraron estudiantes con esa respuesta.";
    }

    document.getElementById('voters-detail').innerText = resultText;
}


// --- INICIO DE LA APLICACIÓN ---

// Definimos los datos base (simulando los datos incrustados del programa Python)
const ALUMNOS_BASE_DATA = {
    "233391247": {"Nombre": "OCTAVIO EDUARDO", "ApellidoPaterno": "APUENTE", "ApellidoMaterno": "AGUILERA"},
    "233128422": {"Nombre": "MATIAS ANDRES", "ApellidoPaterno": "BRAVO", "ApellidoMaterno": "MIRANDA"},
    "234716093": {"Nombre": "KATERINA ISABEL", "ApellidoPaterno": "BRUCHER", "ApellidoMaterno": "ALOMAR"},
    "231549471": {"Nombre": "ANABELLA", "ApellidoPaterno": "CEREGHINO", "ApellidoMaterno": "STONE"},
    "233705934": {"Nombre": "JOAQUIN EDUARDO", "ApellidoPaterno": "CRUZ", "ApellidoMaterno": "MORALES"},
    "235636220": {"Nombre": "ISIDORA ANTONIA", "ApellidoPaterno": "DIEHL", "ApellidoMaterno": "URQUIETA"},
    "233385190": {"Nombre": "CARLOS ROMAN", "ApellidoPaterno": "ESPECH", "ApellidoMaterno": "MARTINEZ"},
    "233708127": {"Nombre": "JULIAN ARIEL", "ApellidoPaterno": "FELDMAN", "ApellidoMaterno": "CASTILLO"},
    "233214787": {"Nombre": "ALVARO IGNACIO", "ApellidoPaterno": "GIACAMAN", "ApellidoMaterno": "HERRERA"},
    "234684167": {"Nombre": "RAFAELA PAZ", "ApellidoPaterno": "GONZÁLEZ", "ApellidoMaterno": "GARESE"},
    "233725412": {"Nombre": "JULIETA LUCIANA", "ApellidoPaterno": "JOUANNET", "ApellidoMaterno": "GRAIEB"},
    "23367656K": {"Nombre": "VICENTE", "ApellidoPaterno": "MARTINEZ", "ApellidoMaterno": "GUTIERREZ"},
    "233830151": {"Nombre": "LUCAS IGNACIO", "ApellidoPaterno": "MEDINA", "ApellidoMaterno": "FUENTES"},
    "23279643K": {"Nombre": "CATALINA BELEN", "ApellidoPaterno": "MENDEZ", "ApellidoMaterno": "TAPIA"},
    "233179558": {"Nombre": "JULIAN", "ApellidoPaterno": "MUJICA", "ApellidoMaterno": "BOWEN"},
    "233753998": {"Nombre": "LUIS FELIPE", "ApellidoPaterno": "NÚÑEZ", "ApellidoMaterno": "BOSSAY"},
    "232907169": {"Nombre": "VICENTE ANDRES", "ApellidoPaterno": "PEREZ", "ApellidoMaterno": "CARVACHO"},
    "233059579": {"Nombre": "ADOLFO ANDRES", "ApellidoPaterno": "PEREZ", "ApellidoMaterno": "FERNANDEZ"},
    "233693480": {"Nombre": "MAGDALENA", "ApellidoPaterno": "PRAT", "ApellidoMaterno": "DE LA MAZA"},
    "23302595K": {"Nombre": "ROCIO", "ApellidoPaterno": "RIVERS", "ApellidoMaterno": "VERGARA"},
    "234445057": {"Nombre": "CONSTANZA JESÚS", "ApellidoPaterno": "RODRIGUEZ", "ApellidoMaterno": "PUEBLA"},
    "235407248": {"Nombre": "VALENTINA JIMENA", "ApellidoPaterno": "ROJAS", "ApellidoMaterno": "COFRE"},
    "233189359": {"Nombre": "FRANCISCA CAROLINA", "ApellidoPaterno": "ROJAS", "ApellidoMaterno": "GONZALEZ"},
    "234655051": {"Nombre": "MARIA ANTONIA", "ApellidoPaterno": "SILVA", "ApellidoMaterno": "DENEGRI"},
    "233610275": {"Nombre": "FACUNDO IÑAKI", "ApellidoPaterno": "SILVA", "ApellidoMaterno": "SALGADO"},
};

window.onload = loadData;