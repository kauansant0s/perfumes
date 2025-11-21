// ver-todos/script-ver-todos.js - Otimizado
import { auth, buscarPerfumes } from '../adicionar-perfume/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { configurarMenuLateral, toggleLoading, debounce, criarPlaceholder } from '../adicionar-perfume/utils.js';

console.log('=== Script ver-todos carregado ===');

let perfumesData = [];
let perfumesFiltrados = [];
let usuarioAtual = null;
let filtroAtual = 'todos';
let ordenacaoAtual = 'nome-asc';
let buscaAtual = '';

// Lê o filtro da URL
const urlParams = new URLSearchParams(window.location.search);
const filtroURL = urlParams.get('filtro');
if (filtroURL && ['todos', 'tenho', 'ja-tive', 'quero-ter'].includes(filtroURL)) {
    filtroAtual = filtroURL;
}

// Verifica autenticação
onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioAtual = user;
        console.log('✅ Usuário logado:', user.email);
        
        // Atualiza foto do usuário
        const fotoUsuario = document.getElementById('foto-usuario');
        if (user.photoURL) {
            fotoUsuario.src = user.photoURL;
        } else {
            fotoUsuario.src = criarPlaceholder(user.displayName?.charAt(0) || 'U', 100);
        }
        
        // Configura menu
        configurarMenuLateral(auth, user);
        
        // Carrega perfumes
        toggleLoading(true);
        try {
            await carregarPerfumes();
        } finally {
            toggleLoading(false);
        }
        
        // Configura event listeners
        configurarEventos();
        
    } else {
        window.location.href = '../login/login.html';
    }
});

/**
 * Carrega perfumes
 */
async function carregarPerfumes() {
    try {
        console.log('📡 Carregando perfumes...');
        perfumesData = await buscarPerfumes(usuarioAtual.uid, true); // usa cache
        console.log(`✅ ${perfumesData.length} perfumes carregados`);
        
        aplicarFiltrosEOrdenacao();
        
    } catch (error) {
        console.error('❌ Erro ao carregar perfumes:', error);
        alert('Erro ao carregar perfumes: ' + error.message);
    }
}

/**
 * Configura eventos
 */
function configurarEventos() {
    // Ativa o filtro correto baseado na URL
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        if (btn.dataset.filtro === filtroAtual) {
            btn.classList.add('ativo');
        } else {
            btn.classList.remove('ativo');
        }
    });
    
    // Filtros de status
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            filtroAtual = btn.dataset.filtro;
            aplicarFiltrosEOrdenacao();
        });
    });
    
    // Ordenação
    document.getElementById('ordenar').addEventListener('change', (e) => {
        ordenacaoAtual = e.target.value;
        aplicarFiltrosEOrdenacao();
    });
    
    // Busca com debounce
    const btnBuscar = document.getElementById('btn-buscar');
    const campoBusca = document.getElementById('campo-busca');
    const inputBusca = document.getElementById('input-busca');
    const btnLimparBusca = document.getElementById('btn-limpar-busca');
    
    btnBuscar.addEventListener('click', () => {
        if (campoBusca.style.display === 'none') {
            campoBusca.style.display = 'flex';
            inputBusca.focus();
        } else {
            campoBusca.style.display = 'none';
            inputBusca.value = '';
            buscaAtual = '';
            aplicarFiltrosEOrdenacao();
        }
    });
    
    // Aplica debounce na busca
    const buscaDebounced = debounce((valor) => {
        buscaAtual = valor.toLowerCase();
        aplicarFiltrosEOrdenacao();
    }, 300);
    
    inputBusca.addEventListener('input', (e) => {
        buscaDebounced(e.target.value);
    });
    
    btnLimparBusca.addEventListener('click', () => {
        inputBusca.value = '';
        buscaAtual = '';
        campoBusca.style.display = 'none';
        aplicarFiltrosEOrdenacao();
    });
}

/**
 * Aplica filtros e ordenação
 */
function aplicarFiltrosEOrdenacao() {
    // 1. Filtrar por status
    if (filtroAtual === 'todos') {
        perfumesFiltrados = [...perfumesData];
    } else {
        perfumesFiltrados = perfumesData.filter(p => p.status === filtroAtual);
    }
    
    // 2. Filtrar por busca
    if (buscaAtual) {
        perfumesFiltrados = perfumesFiltrados.filter(p => 
            p.nome.toLowerCase().includes(buscaAtual) || 
            p.marca.toLowerCase().includes(buscaAtual)
        );
    }
    
    // 3. Ordenar
    ordenarPerfumes();
    
    // 4. Renderizar
    renderizarPerfumes();
}

/**
 * Ordena perfumes
 */
function ordenarPerfumes() {
    switch (ordenacaoAtual) {
        case 'nome-asc':
            perfumesFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));
            break;
        case 'nome-desc':
            perfumesFiltrados.sort((a, b) => b.nome.localeCompare(a.nome));
            break;
        case 'marca-asc':
            perfumesFiltrados.sort((a, b) => a.marca.localeCompare(b.marca));
            break;
        case 'marca-desc':
            perfumesFiltrados.sort((a, b) => b.marca.localeCompare(a.marca));
            break;
        case 'data-desc':
            perfumesFiltrados.sort((a, b) => {
                const dataA = a.dataCriacao?.toMillis?.() || 0;
                const dataB = b.dataCriacao?.toMillis?.() || 0;
                return dataB - dataA;
            });
            break;
        case 'data-asc':
            perfumesFiltrados.sort((a, b) => {
                const dataA = a.dataCriacao?.toMillis?.() || 0;
                const dataB = b.dataCriacao?.toMillis?.() || 0;
                return dataA - dataB;
            });
            break;
        case 'nota-desc':
            perfumesFiltrados.sort((a, b) => {
                const notaA = a.avaliacoes?.media || 0;
                const notaB = b.avaliacoes?.media || 0;
                return notaB - notaA;
            });
            break;
        case 'nota-asc':
            perfumesFiltrados.sort((a, b) => {
                const notaA = a.avaliacoes?.media || 0;
                const notaB = b.avaliacoes?.media || 0;
                return notaA - notaB;
            });
            break;
    }
}

/**
 * Renderiza perfumes
 */
function renderizarPerfumes() {
    const grid = document.getElementById('grid-perfumes');
    const semPerfumes = document.getElementById('sem-perfumes');
    
    if (perfumesFiltrados.length === 0) {
        grid.style.display = 'none';
        semPerfumes.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    semPerfumes.style.display = 'none';
    grid.innerHTML = '';
    
    // Renderização otimizada com fragment
    const fragment = document.createDocumentFragment();
    
    perfumesFiltrados.forEach(perfume => {
        const card = criarCardPerfume(perfume);
        fragment.appendChild(card);
    });
    
    grid.appendChild(fragment);
}

/**
 * Cria card de perfume
 */
function criarCardPerfume(perfume) {
    const card = document.createElement('div');
    card.className = 'perfume-card';
    
    // ✅ NOVO: Usa <a> ao invés de onclick
    const link = document.createElement('a');
    link.href = `../perfumes/perfume.html?id=${perfume.id}`;
    link.setAttribute('aria-label', `Ver detalhes de ${perfume.nome}`);
    link.setAttribute('tabindex', '0');
    
    const foto = document.createElement('div');
    foto.className = 'perfume-foto';
    
    if (perfume.fotoURL && perfume.fotoURL.trim() !== '') {
        const img = document.createElement('img');
        img.src = perfume.fotoURL;
        img.alt = perfume.nome;
        img.loading = 'lazy';
        
        img.onerror = () => {
            foto.innerHTML = `<div class="perfume-foto-placeholder">${perfume.nome}</div>`;
        };
        
        foto.appendChild(img);
    } else {
        foto.innerHTML = `<div class="perfume-foto-placeholder">${perfume.nome}</div>`;
    }
    
    const nome = document.createElement('div');
    nome.className = 'perfume-nome';
    nome.textContent = perfume.nome;
    nome.title = perfume.nome;
    
    link.appendChild(foto);
    link.appendChild(nome);
    card.appendChild(link);
    
    return card;
}