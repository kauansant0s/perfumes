// perfumes/script-perfume.js
import { auth } from '../adicionar-perfume/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCWuG4gVnf6r2JVBJX4k6a5kwM_Jf3cw8c",
  authDomain: "meus-pefumes.firebaseapp.com",
  projectId: "meus-pefumes",
  storageBucket: "meus-pefumes.firebasestorage.app",
  messagingSenderId: "5138203233",
  appId: "1:5138203233:web:b684d4397c4ffefa572020"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('=== Script perfume carregado ===');

let perfumeData = null;
let usuarioAtual = null;

// Cores dos acordes
const coresAcordes = {
    'Abaunilhado': '#D4A574',
    'Aldeídico': '#E8E8E8',
    'Alcoólico': '#C9B8A8',
    'Almiscarado': '#F5E6D3',
    'Ambarado': '#FFB347',
    'Amadeirado': '#8B4513',
    'Animálico': '#654321',
    'Aquático': '#4DD0E1',
    'Aromático': '#7CB342',
    'Atalcado': '#E8D5C4',
    'Chipre': '#556B2F',
    'Cítrico': '#FFA500',
    'Couro': '#654321',
    'Cremoso': '#FFF8DC',
    'Doce': '#FFB6C1',
    'Esfumaçado': '#696969',
    'Especiado': '#CD853F',
    'Floral': '#FF69B4',
    'Floral Amarelo': '#FFD700',
    'Floral Branco': '#F5F5F5',
    'Fougère': '#2E8B57',
    'Fresco': '#87CEEB',
    'Frutado': '#FF6347',
    'Gourmand': '#D2691E',
    'Lactônico': '#FFF5EE',
    'Metálico': '#B0B0B0',
    'Oriental': '#8B0000',
    'Terroso': '#8B7355',
    'Tropical': '#FF8C00',
    'Verde': '#228B22'
};

// Pega o ID do perfume da URL
const urlParams = new URLSearchParams(window.location.search);
const perfumeId = urlParams.get('id');

if (!perfumeId) {
    alert('ID do perfume não encontrado!');
    window.location.href = '../perfil/perfil.html';
}

// Verifica autenticação
onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioAtual = user;
        await carregarPerfume();
        
        // Configura menu lateral
        configurarMenu(user);
    } else {
        window.location.href = '../login/login.html';
    }
});

// Configurar menu lateral
function configurarMenu(user) {
    // Foto e nome do usuário no menu
    const menuFoto = document.getElementById('menu-foto');
    const menuNome = document.getElementById('menu-nome');
    
    if (user.photoURL) {
        menuFoto.src = user.photoURL;
    } else {
        menuFoto.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle fill="%23d9d9d9" cx="40" cy="40" r="40"/></svg>';
    }
    
    menuNome.textContent = user.displayName || 'Usuário';
    
    // Toggle menu
    const menuToggle = document.getElementById('menu-toggle');
    const menuLateral = document.getElementById('menu-lateral');
    const menuOverlay = document.getElementById('menu-overlay');
    
    menuToggle.addEventListener('click', () => {
        menuLateral.classList.toggle('aberto');
        menuOverlay.classList.toggle('ativo');
    });
    
    menuOverlay.addEventListener('click', () => {
        menuLateral.classList.remove('aberto');
        menuOverlay.classList.remove('ativo');
    });
    
    // Logout
    document.getElementById('menu-logout').addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Deseja realmente sair?')) {
            await auth.signOut();
            window.location.href = '../login/login.html';
        }
    });
}

async function carregarPerfume() {
    try {
        console.log('Carregando perfume:', perfumeId);
        
        const perfumeRef = doc(db, "perfumes", perfumeId);
        const perfumeSnap = await getDoc(perfumeRef);
        
        if (!perfumeSnap.exists()) {
            alert('Perfume não encontrado!');
            window.location.href = '../perfil/perfil.html';
            return;
        }
        
        perfumeData = perfumeSnap.data();
        console.log('Perfume carregado:', perfumeData);
        
        renderizarPerfume();
        
    } catch (error) {
        console.error('Erro ao carregar perfume:', error);
        alert('Erro ao carregar perfume!');
    }
}

function renderizarPerfume() {
    // Foto
    const fotoElement = document.getElementById('foto-perfume');
    if (perfumeData.fotoURL) {
        fotoElement.src = perfumeData.fotoURL;
        fotoElement.alt = perfumeData.nome;
    }
    
    // Nome e Marca
    document.getElementById('nome-perfume').textContent = perfumeData.nome;
    const linkMarca = document.getElementById('link-marca');
    linkMarca.textContent = perfumeData.marca;
    linkMarca.href = `../marca/marca.html?nome=${encodeURIComponent(perfumeData.marca)}`;
    
    // Descrição gerada
    gerarDescricao();
    
    // Acordes
    renderizarAcordes();
    
    // Notas
    renderizarNotas();
    
    // Avaliações (se tiver)
    if (perfumeData.avaliacoes) {
        renderizarAvaliacoes();
    }
    
    // Status
    if (perfumeData.status) {
        const statusInput = document.querySelector(`input[value="${perfumeData.status}"]`);
        if (statusInput) {
            statusInput.checked = true;
        }
    }
    
    // Review
    renderizarReview();
}

function gerarDescricao() {
    let descricao = `A fragrância ${perfumeData.nome} de ${perfumeData.marca} é um cheiro majoritariamente `;
    
    // Pega os 2 primeiros acordes
    if (perfumeData.acordes && perfumeData.acordes.length > 0) {
        const primeirosAcordes = perfumeData.acordes.slice(0, 2);
        if (primeirosAcordes.length === 1) {
            descricao += primeirosAcordes[0].toLowerCase();
        } else {
            descricao += `${primeirosAcordes[0].toLowerCase()} e ${primeirosAcordes[1].toLowerCase()}`;
        }
    }
    
    // Adiciona ponto final (por enquanto, sem ano de lançamento)
    descricao += '.';
    
    // Longevidade e Projeção (se tiver avaliações)
    if (perfumeData.avaliacoes) {
        const longevidade = classificarNota(perfumeData.avaliacoes.fixacao);
        const projecao = classificarNota(perfumeData.avaliacoes.projecao);
        
        // Se forem iguais, usa singular
        if (longevidade === projecao) {
            descricao += ` Com longevidade e projeção ${longevidade}.`;
        } else {
            descricao += ` Com longevidade ${longevidade} e projeção ${projecao}.`;
        }
    }
    
    // Perfumista
    if (perfumeData.perfumista && perfumeData.perfumista.trim() !== '') {
        descricao += ` Assinado pelo perfumista ${perfumeData.perfumista}.`;
    }
    
    document.getElementById('descricao-perfume').textContent = descricao;
}

function classificarNota(nota) {
    if (nota >= 5) return 'altíssima';
    if (nota >= 4) return 'alta';
    if (nota >= 3.5) return 'acima da média';
    if (nota >= 2.5) return 'mediana';
    if (nota >= 2) return 'baixa';
    return 'baixíssima';
}

function renderizarAcordes() {
    const acordesLista = document.getElementById('acordes-lista');
    acordesLista.innerHTML = '';
    
    if (perfumeData.acordes && perfumeData.acordes.length > 0) {
        perfumeData.acordes.forEach(acorde => {
            const tag = document.createElement('span');
            tag.className = 'acorde-tag';
            tag.textContent = acorde;
            tag.style.backgroundColor = coresAcordes[acorde] || '#999';
            
            // Se a cor for clara, usa texto escuro
            const cor = coresAcordes[acorde] || '#999';
            if (corClara(cor)) {
                tag.style.color = '#333';
            }
            
            acordesLista.appendChild(tag);
        });
    } else {
        acordesLista.innerHTML = '<span class="sem-info">Acordes não informados</span>';
    }
}

function corClara(cor) {
    // Remove # e converte para RGB
    const rgb = parseInt(cor.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >>  8) & 0xff;
    const b = (rgb >>  0) & 0xff;
    
    // Calcula luminosidade
    const luminosidade = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminosidade > 186;
}

function renderizarNotas() {
    // Notas de topo
    const topoElement = document.getElementById('notas-topo');
    renderizarListaNotas(topoElement, perfumeData.notas?.topo);
    
    // Notas de coração
    const coracaoElement = document.getElementById('notas-coracao');
    renderizarListaNotas(coracaoElement, perfumeData.notas?.coracao);
    
    // Notas de fundo
    const fundoElement = document.getElementById('notas-fundo');
    renderizarListaNotas(fundoElement, perfumeData.notas?.fundo);
}

function renderizarListaNotas(elemento, notas) {
    elemento.innerHTML = '';
    
    if (notas && notas.length > 0) {
        notas.forEach(nota => {
            const tag = document.createElement('span');
            tag.className = 'nota-tag';
            tag.textContent = nota;
            elemento.appendChild(tag);
        });
    } else {
        elemento.innerHTML = '<span class="sem-info">Não informadas</span>';
    }
}

function renderizarAvaliacoes() {
    const container = document.getElementById('avaliacoes-container');
    container.style.display = 'block';
    
    // Média das estrelas
    const media = perfumeData.avaliacoes.media || 0;
    document.querySelector('.nota-media').textContent = media.toFixed(2).replace('.', ',');
    
    // Renderiza estrelas da média
    const estrelasDisplay = document.querySelector('.estrelas-display');
    estrelasDisplay.innerHTML = '';
    
    const estrelasCompletas = Math.floor(media);
    const temMeia = (media % 1) >= 0.5;
    
    for (let i = 0; i < estrelasCompletas; i++) {
        const estrela = document.createElement('span');
        estrela.className = 'estrela';
        estrela.textContent = '★';
        estrela.style.color = '#FFD700';
        estrelasDisplay.appendChild(estrela);
    }
    
    if (temMeia) {
        const estrela = document.createElement('span');
        estrela.className = 'estrela';
        estrela.textContent = '★';
        estrela.style.color = '#FFD700';
        estrela.style.opacity = '0.5';
        estrelasDisplay.appendChild(estrela);
    }
    
    const estrelasVazias = 5 - Math.ceil(media);
    for (let i = 0; i < estrelasVazias; i++) {
        const estrela = document.createElement('span');
        estrela.className = 'estrela';
        estrela.textContent = '★';
        estrela.style.color = '#ccc';
        estrelasDisplay.appendChild(estrela);
    }
    
    // Renderiza avaliações detalhadas
    renderizarAvaliacaoDetalhada('cheiro', perfumeData.avaliacoes.cheiro);
    renderizarAvaliacaoDetalhada('projecao', perfumeData.avaliacoes.projecao);
    renderizarAvaliacaoDetalhada('fixacao', perfumeData.avaliacoes.fixacao);
    renderizarAvaliacaoDetalhada('versatilidade', perfumeData.avaliacoes.versatilidade);
    
    // Adiciona evento de clique para expandir/recolher
    const toggleBtn = document.getElementById('toggle-avaliacoes');
    const avaliacoesDetalhadas = document.getElementById('avaliacoes-detalhadas');
    
    toggleBtn.addEventListener('click', () => {
        avaliacoesDetalhadas.classList.toggle('expandido');
    });
    
    // Sliders
    if (perfumeData.caracteristicas) {
        document.querySelector('.slider-clima').value = perfumeData.caracteristicas.clima || 50;
        document.querySelector('.slider-ambiente').value = perfumeData.caracteristicas.ambiente || 50;
        document.querySelector('.slider-genero').value = perfumeData.caracteristicas.genero || 50;
        document.querySelector('.slider-hora').value = perfumeData.caracteristicas.hora || 50;
    }
}

function renderizarAvaliacaoDetalhada(tipo, nota) {
    const notaElement = document.getElementById(`nota-${tipo}`);
    const estrelasElement = document.getElementById(`estrelas-${tipo}`);
    
    notaElement.textContent = nota.toFixed(1);
    
    // Renderiza mini estrelas
    estrelasElement.innerHTML = '';
    const estrelasCompletas = Math.floor(nota);
    const temMeia = (nota % 1) >= 0.5;
    
    for (let i = 0; i < estrelasCompletas; i++) {
        const estrela = document.createElement('span');
        estrela.className = 'mini-estrela';
        estrela.textContent = '★';
        estrelasElement.appendChild(estrela);
    }
    
    if (temMeia) {
        const estrela = document.createElement('span');
        estrela.className = 'mini-estrela';
        estrela.textContent = '★';
        estrela.style.opacity = '0.5';
        estrelasElement.appendChild(estrela);
    }
    
    const estrelasVazias = 5 - Math.ceil(nota);
    for (let i = 0; i < estrelasVazias; i++) {
        const estrela = document.createElement('span');
        estrela.className = 'mini-estrela';
        estrela.textContent = '★';
        estrela.style.color = '#ccc';
        estrelasElement.appendChild(estrela);
    }
}

function renderizarReview() {
    const container = document.getElementById('reviews-container');
    
    if (perfumeData.review && perfumeData.review.texto && perfumeData.review.texto.trim() !== '') {
        container.innerHTML = `
            <div class="review-card">
                <div class="review-header">
                    <img src="${usuarioAtual.photoURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle fill="%23d9d9d9" cx="20" cy="20" r="20"/></svg>'}" alt="Foto do usuário" class="review-avatar">
                    <span class="review-autor">${usuarioAtual.displayName || 'Usuário'}</span>
                </div>
                ${perfumeData.review.titulo ? `<h4 style="margin: 10px 0; font-size: 16px; font-weight: 600;">${perfumeData.review.titulo}</h4>` : ''}
                <p class="review-texto">${perfumeData.review.texto}</p>
            </div>
        `;
    } else {
        container.innerHTML = '<p class="sem-reviews">Nenhuma review ainda</p>';
    }
}

// Botão de editar perfume
document.getElementById('btn-editar')?.addEventListener('click', () => {
    if (perfumeId) {
        window.location.href = `../adicionar-perfume/form-add-perf.html?id=${perfumeId}&editar=true`;
    }
});