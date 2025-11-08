// Importa os módulos necessários do three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Variáveis Globais ---
let scene, camera, renderer, controls;
let functionLine, yInterceptMesh, xInterceptMesh;
let lineGeometry;
let customPointMeshes = []; // para rastrear pontos calculados
let axisLabelGroup; // Grupo para os números
const lineExtent = 10; // Define o quão longe a linha se estende (de -10 a +10)

// --- Referências do DOM (Interface) ---
const container = document.getElementById('canvas-container');
const sliderA = document.getElementById('slider-a');
const aValue = document.getElementById('a-value');
const sliderB = document.getElementById('slider-b');
const bValue = document.getElementById('b-value');
const functionEquation = document.getElementById('function-equation');
const functionType = document.getElementById('function-type');
const functionRoot = document.getElementById('function-root');
const yIntercept = document.getElementById('y-intercept');

const xInput = document.getElementById('x-input');
const calcButton = document.getElementById('calculate-point-btn');
const pointResult = document.getElementById('point-result');
const tableBody = document.getElementById('points-table-body');

const example1Btn = document.getElementById('example-1-btn');
const example2Btn = document.getElementById('example-2-btn');
const resetBtn = document.getElementById('reset-btn');
const visualizePointsBtn = document.getElementById('visualize-points-btn');

// --- Funções Principais ---

/**
 * Inicializa a cena 3D, câmera, luzes, e objetos.
 */
function init() {
    // 1. Cena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827); // Cor de fundo (Tailwind bg-gray-900)

    // 2. Câmera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 10); // Posição inicial da câmera
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 4. Controles (para girar a cena)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Efeito de "desaceleração" suave
    controls.dampingFactor = 0.05;

    // 5. Luzes
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Luz ambiente
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Luz solar
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // 6. Helpers (Grid e Eixos)
    const gridHelper = new THREE.GridHelper(lineExtent * 2, lineExtent * 2);
    gridHelper.rotation.x = Math.PI / 2; // Gira o grid para ser o plano X-Y
    scene.add(gridHelper);

    // Eixos (X=vermelho, Y=verde, Z=azul)
    const axesHelper = new THREE.AxesHelper(lineExtent);
    scene.add(axesHelper);

    // Adiciona os números aos eixos
    createAxisLabels();

    // 7. Objetos da Função
    
    // A linha da função (amarela)
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 }); // Amarelo
    lineGeometry = new THREE.BufferGeometry();
    functionLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(functionLine);

    // Ponto de Interceptação Y (Coef. Linear 'b')
    const interceptGeom = new THREE.SphereGeometry(0.2, 16, 16); // Esfera pequena
    const yInterceptMat = new THREE.MeshStandardMaterial({ color: 0x2563eb }); // Azul
    yInterceptMesh = new THREE.Mesh(interceptGeom, yInterceptMat);
    scene.add(yInterceptMesh);

    // Ponto de Interceptação X (Zero da Função)
    const xInterceptMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 }); // Vermelho
    xInterceptMesh = new THREE.Mesh(interceptGeom, xInterceptMat);
    scene.add(xInterceptMesh);

    // 8. Event Listeners
    sliderA.addEventListener('input', updateFunctionAndClearPoints);
    sliderB.addEventListener('input', updateFunctionAndClearPoints);
    calcButton.addEventListener('click', addCustomPoint);
    window.addEventListener('resize', onWindowResize);

    example1Btn.addEventListener('click', () => loadExample(2, 1));
    example2Btn.addEventListener('click', () => loadExample(-2, -1));
    resetBtn.addEventListener('click', () => loadExample(0, 0));
    visualizePointsBtn.addEventListener('click', visualizeTablePoints);

    // 9. Chamada inicial
    updateFunction(); // Atualiza a função com os valores iniciais (a=2, b=-1)
    loadInitialExamplePoint(); // Carrega o ponto de exemplo (x=1)
    animate(); // Inicia o loop de animação
}

/**
 * Cria um sprite de texto (número)
 * @param {string} text - O texto a ser exibido (ex: "1", "2")
 * @returns {THREE.Sprite} - O objeto sprite
 */
function createNumberSprite(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const size = 64; // Tamanho da textura (potência de 2)
    canvas.width = size;
    canvas.height = size;
    
    context.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Cor do texto
    context.font = '48px Arial'; // Tamanho e fonte
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    context.fillText(text, size / 2, size / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    sprite.scale.set(0.7, 0.7, 1.0); // Ajusta o tamanho do sprite na cena
    
    return sprite;
}

/**
 * Cria e posiciona os números ao longo dos eixos X e Y
 */
function createAxisLabels() {
    if (axisLabelGroup) {
        scene.remove(axisLabelGroup); // Limpa labels antigos se houver
    }
    axisLabelGroup = new THREE.Group();
    
    const labelOffset = 0.3; // Distância do eixo

    for (let i = -lineExtent; i <= lineExtent; i++) {
        if (i === 0) continue; // Não desenha o "0"

        // Números do Eixo X (um pouco abaixo do eixo)
        const xLabel = createNumberSprite(i.toString());
        xLabel.position.set(i, -labelOffset, 0);
        axisLabelGroup.add(xLabel);

        // Números do Eixo Y (um pouco à esquerda do eixo)
        const yLabel = createNumberSprite(i.toString());
        yLabel.position.set(-labelOffset, i, 0);
        axisLabelGroup.add(yLabel);
    }
    scene.add(axisLabelGroup);
}

/**
 * Carrega um exemplo de função definindo os sliders.
 * @param {number} aVal - O valor para o coeficiente angular 'a'.
 * @param {number} bVal - O valor para o coeficiente linear 'b'.
 */
function loadExample(aVal, bVal) {
    sliderA.value = aVal;
    sliderB.value = bVal;
    updateFunctionAndClearPoints(); // Atualiza o gráfico e limpa pontos customizados
}

/**
 * Calcula e adiciona um ponto de exemplo inicial
 * para demonstrar a tabela e o cálculo.
 */
function loadInitialExamplePoint() {
    // Define o valor do input X e simula um clique para adicionar o ponto
    xInput.value = '1'; 
    addCustomPoint();
}

/**
 * Wrapper para atualizar a função E limpar os pontos customizados.
 */
function updateFunctionAndClearPoints() {
    updateFunction();
    // NÂO limpa a tabela automaticamente aqui. A tabela persiste.
    clearCustomPointMeshes(); // Apenas limpa as esferas 3D se houver.
}

/**
 * Limpa apenas as esferas 3D dos pontos calculados.
 */
function clearCustomPointMeshes() {
    customPointMeshes.forEach(mesh => scene.remove(mesh));
    customPointMeshes = [];
}

/**
 * Pega os pontos da tabela e os visualiza na cena 3D.
 */
function visualizeTablePoints() {
    clearCustomPointMeshes(); // Limpa quaisquer pontos 3D existentes antes de adicionar novos
    const rows = tableBody.rows;
    for (let i = 0; i < rows.length; i++) {
        const x = parseFloat(rows[i].cells[0].textContent);
        const y = parseFloat(rows[i].cells[1].textContent);
        
        if (!isNaN(x) && !isNaN(y)) {
            const pointGeom = new THREE.SphereGeometry(0.15, 16, 16);
            const pointMat = new THREE.MeshStandardMaterial({ color: 0x9333ea }); // Roxo
            const pointMesh = new THREE.Mesh(pointGeom, pointMat);
            pointMesh.position.set(x, y, 0);
            scene.add(pointMesh);
            customPointMeshes.push(pointMesh);
        }
    }
}

/**
 * Calcula um novo ponto (x,y) e o adiciona à cena e à tabela.
 */
function addCustomPoint() {
    const x = parseFloat(xInput.value);
    if (isNaN(x)) {
        pointResult.textContent = 'Por favor, insira um número válido para x.';
        return;
    }

    // Obter 'a' e 'b' atuais
    const a = parseFloat(sliderA.value);
    const b = parseFloat(sliderB.value);

    // Calcular 'y'
    const y = a * x + b;

    // 1. Atualizar o resultado na UI
    pointResult.textContent = `f(${x.toFixed(2)}) = ${y.toFixed(2)}`;

    // 2. Adicionar o ponto à tabela
    const newRow = tableBody.insertRow(0); // Adiciona no topo
    newRow.className = "bg-white border-b";
    newRow.innerHTML = `
        <td class="px-3 py-2 font-medium text-gray-900">${x.toFixed(2)}</td>
        <td class="px-3 py-2">${y.toFixed(2)}</td>
    `;

    // 3. *Não* adiciona o ponto à cena 3D automaticamente aqui.
    // Isso será feito pelo botão "Visualizar Pontos na Malha".

    // 4. Limpar o input
    xInput.value = '';
}

/**
 * Atualiza a linha e os pontos com base nos sliders.
 */
function updateFunction() {
    // 1. Obter valores dos sliders
    const a = parseFloat(sliderA.value);
    const b = parseFloat(sliderB.value);

    // 2. Atualizar UI (painel de informações)
    aValue.textContent = a.toFixed(1);
    bValue.textContent = b.toFixed(1);
    const bSign = b >= 0 ? '+' : '';
    functionEquation.textContent = `f(x) = ${a.toFixed(1)}x ${bSign} ${Math.abs(b).toFixed(1)}`;

    if (a > 0) {
        functionType.textContent = 'Crescente (a > 0)';
        functionType.className = 'font-bold text-green-600';
    } else if (a < 0) {
        functionType.textContent = 'Decrescente (a < 0)';
        functionType.className = 'font-bold text-orange-600';
    } else {
        functionType.textContent = 'Constante (a = 0)';
        functionType.className = 'font-bold text-gray-500';
    }

    // 3. Atualizar Posição dos Objetos 3D
    
    // Posição do Intercepto Y (sempre em x=0)
    yInterceptMesh.position.set(0, b, 0);
    yIntercept.textContent = `(0, ${b.toFixed(1)})`;


    // Posição do Intercepto X (Zero da Função)
    if (a === 0) {
        // Se a=0 (reta horizontal)
        if (b === 0) {
            // A reta é o próprio eixo X
            functionRoot.textContent = 'Infinitos Zeros (eixo x)';
            xInterceptMesh.visible = false; // Oculta o ponto, pois a linha inteira é o zero
        } else {
            // Reta paralela ao eixo X, nunca o toca
            functionRoot.textContent = 'Nenhum Zero';
            xInterceptMesh.visible = false; // Oculta o ponto
        }
    } else {
        // Cálculo normal do zero: x = -b / a
        const root = -b / a;
        functionRoot.textContent = `x = ${root.toFixed(2)}`;
        xInterceptMesh.position.set(root, 0, 0);
        xInterceptMesh.visible = true; // Garante que o ponto está visível
    }

    // 4. Atualizar a Geometria da Linha
    // Precisamos de 2 pontos para definir a reta: (x1, y1) e (x2, y2)
    const x1 = -lineExtent;
    const y1 = a * x1 + b;
    const z1 = 0;

    const x2 = lineExtent;
    const y2 = a * x2 + b;
    const z2 = 0;

    const vertices = new Float32Array([
        x1, y1, z1,
        x2, y2, z2
    ]);
    
    // Atualiza o atributo 'position' da geometria
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    lineGeometry.attributes.position.needsUpdate = true; // Informa ao three.js para atualizar
}

/**
 * Loop de animação (chamado a cada frame).
 */
function animate() {
    requestAnimationFrame(animate);

    // Atualiza os controles de órbita
    controls.update();

    // Renderiza a cena
    renderer.render(scene, camera);
}

/**
 * Lida com o redimensionamento da janela do navegador.
 */
function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// --- Iniciar a aplicação ---
init();