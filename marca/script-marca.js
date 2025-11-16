// marca/script-marca.js
import { auth, buscarPerfumes } from '../adicionar-perfume/firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { toggleLoading, criarPlaceholder } from '../adicionar-perfume/utils.js';

console.log('=== Script marca carregado ===');

let perfumesData = [];
let perfumesFiltrados = [];
let usuarioAtual = null;
let nomeMarca = '';
let filtroAtual = 'todos';
let ordenacaoAtual = 'nome-asc';

// Pega o nome da marca da URL
const urlParams = new URLSearchParams(window.location.search);
nomeMarca = urlParams.get('nome');

if (!nomeMarca) {
    alert('Nome da marca não encontrado!');
    window.location.href = '../perfil/perfil.html';
}

// Decodifica o nome da marca
nomeMarca = decodeURIComponent(nomeMarca);

console.log('📍 Marca:', nomeMarca);

// ✅ CORREÇÃO: Configurar menu ANTES da autenticação
const menuHamburger = document.getElementById('menu-toggle');
const menuLateral = document.getElementById('menu-lateral');
const menuOverlay = document.getElementById('menu-overlay');

if (menuHamburger) {
    menuHamburger.addEventListener('click', () => {
        console.log('🔘 Menu toggle clicado');
        menuLateral.classList.toggle('aberto');
        menuOverlay.classList.toggle('ativo');
    });
}

if (menuOverlay) {
    menuOverlay.addEventListener('click', () => {
        console.log('🔘 Overlay clicado');
        menuLateral.classList.remove('aberto');
        menuOverlay.classList.remove('ativo');
    });
}

// Verifica autenticação
onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioAtual = user;
        console.log('✅ Usuário logado:', user.email);
        
        // ✅ Configura menu lateral
        configurarMenuLateral(user);
        
        toggleLoading(true);
        
        try {
            await carregarPerfumesDaMarca();
        } catch (error) {
            console.error('❌ Erro ao carregar perfumes:', error);
            alert('Erro ao carregar perfumes da marca');
        } finally {
            toggleLoading(false);
        }
        
        configurarEventos();
        
    } else {
        window.location.href = '../login/login.html';
    }
});

/**
 * ✅ Configura menu lateral
 */
function configurarMenuLateral(user) {
    const menuFoto = document.getElementById('menu-foto');
    const menuNome = document.getElementById('menu-nome');
    
    if (menuFoto && menuNome) {
        if (user.photoURL) {
            menuFoto.src = user.photoURL;
        } else {
            menuFoto.src = criarPlaceholder(user.displayName?.charAt(0) || 'U', 80);
        }
        
        menuNome.textContent = user.displayName || 'Usuário';
    }
    
    const btnLogout = document.getElementById('menu-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Deseja realmente sair?')) {
                try {
                    await signOut(auth);
                    window.location.href = '../login/login.html';
                } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                    alert('Erro ao fazer logout. Tente novamente.');
                }
            }
        });
    }
}

/**
 * Carrega perfumes da marca
 */
async function carregarPerfumesDaMarca() {
    try {
        console.log('📡 Buscando perfumes da marca:', nomeMarca);
        
        // Busca todos os perfumes do usuário
        const todosPerfumes = await buscarPerfumes(usuarioAtual.uid, true);
        
        // Filtra apenas os perfumes desta marca
        perfumesData = todosPerfumes.filter(p => 
            p.marca && p.marca.toLowerCase() === nomeMarca.toLowerCase()
        );
        
        console.log(`✅ ${perfumesData.length} perfumes encontrados da marca ${nomeMarca}`);
        
        // Atualiza o header
        await atualizarHeader();
        
        // Atualiza estatísticas
        atualizarEstatisticas();
        
        // Renderiza perfumes
        aplicarFiltrosEOrdenacao();
        
    } catch (error) {
        console.error('❌ Erro ao carregar perfumes:', error);
        throw error;
    }
}

/**
 * Atualiza header da página
 */
async function atualizarHeader() {
    // Nome da marca
    document.getElementById('nome-marca').textContent = nomeMarca;
    
    // Logo temporário (primeiras 3 letras em maiúsculo)
    const logoTemp = nomeMarca.substring(0, 3).toUpperCase();
    document.getElementById('logo-texto').textContent = logoTemp;
    
    // Total de perfumes
    document.getElementById('total-perfumes').textContent = perfumesData.length;
    
    // Atualiza título da página
    document.title = `${nomeMarca} - Marca`;
    
    // ✅ Busca informações da marca na internet
    buscarInformacoesMarca();
}

/**
 * ✅ CORRIGIDO: Busca site e logo da marca usando IA
 */
async function buscarInformacoesMarca() {
    try {
        console.log('🤖 Buscando informações da marca:', nomeMarca);
        
        // ✅ Verifica cache primeiro
        const infoCache = buscarInfoMarcaCache(nomeMarca);
        if (infoCache) {
            console.log('💾 Informações encontradas no cache:', infoCache);
            
            if (infoCache.logo && infoCache.logo !== 'vazio') {
                atualizarLogo(infoCache.logo);
            }
            
            if (infoCache.pais || infoCache.anoFundacao) {
                adicionarInfoExtra(infoCache);
            }
            
            return;
        }
        
        console.log('📡 Cache não encontrado, buscando na internet...');
        
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 2000,
                tools: [{
                    "type": "web_search_20250305",
                    "name": "web_search"
                }],
                messages: [{
                    role: "user",
                    content: `Você precisa encontrar informações sobre a marca de perfumes "${nomeMarca}".

TAREFAS:
1. Busque o site oficial da marca (não sites de lojas que vendem)
2. Busque uma URL de imagem da logo oficial em boa qualidade
3. Descubra o país de origem
4. Descubra o ano de fundação (se disponível)

FORMATO DA RESPOSTA:
Responda SOMENTE com um objeto JSON, sem markdown, sem explicações:
{
  "site": "url completa",
  "logo": "url completa da imagem",
  "pais": "nome do país",
  "anoFundacao": "ano"
}

Se não encontrar alguma informação, use ""`
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📡 Resposta completa da API:', data);
        
        // Processa a resposta
        if (data.content && data.content.length > 0) {
            let textoResposta = '';
            
            // Junta todos os blocos de texto
            for (const item of data.content) {
                if (item.type === 'text') {
                    textoResposta += item.text + '\n';
                }
            }
            
            console.log('📝 Texto completo da resposta:', textoResposta);
            
            // Tenta extrair JSON de várias formas
            let info = null;
            
            // Tenta 1: Busca por bloco JSON com markdown
            let jsonMatch = textoResposta.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
                info = JSON.parse(jsonMatch[1]);
            } else {
                // Tenta 2: Busca por JSON direto
                jsonMatch = textoResposta.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    info = JSON.parse(jsonMatch[0]);
                }
            }
            
            if (info) {
                console.log('✅ Informações extraídas:', info);
                
                // Atualiza logo se encontrou
                if (info.logo && info.logo.trim() !== '' && info.logo !== 'vazio') {
                    atualizarLogo(info.logo);
                }
                
                // Adiciona informações extras no header
                if ((info.pais && info.pais !== '') || (info.anoFundacao && info.anoFundacao !== '')) {
                    adicionarInfoExtra(info);
                }
                
                // Salva no localStorage para cache
                salvarInfoMarcaCache(nomeMarca, info);
                
            } else {
                console.log('⚠️ Não foi possível extrair JSON da resposta');
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar informações da marca:', error);
        console.error('Detalhes:', error.message);
        // Não mostra erro para o usuário, apenas mantém o logo padrão
    }
}

/**
 * Atualiza logo da marca
 */
function atualizarLogo(urlLogo) {
    const logoElement = document.getElementById('logo-marca');
    const logoTexto = document.getElementById('logo-texto');
    
    // Cria imagem
    const img = document.createElement('img');
    img.src = urlLogo;
    img.alt = `Logo ${nomeMarca}`;
    img.style.maxWidth = '80%';
    img.style.maxHeight = '80%';
    img.style.objectFit = 'contain';
    
    img.onload = () => {
        logoTexto.style.display = 'none';
        logoElement.appendChild(img);
        console.log('✅ Logo carregada com sucesso');
    };
    
    img.onerror = () => {
        console.log('❌ Erro ao carregar logo, mantendo texto');
    };
}

/**
 * Adiciona informações extras (país, ano)
 */
function adicionarInfoExtra(info) {
    const header = document.querySelector('.header');
    const totalPerfumes = document.querySelector('.total-perfumes');
    
    let infoTexto = [];
    if (info.pais && info.pais !== 'vazio') infoTexto.push(info.pais);
    if (info.anoFundacao && info.anoFundacao !== 'vazio') infoTexto.push(`Fundada em ${info.anoFundacao}`);
    
    if (infoTexto.length > 0) {
        const infoElement = document.createElement('p');
        infoElement.className = 'info-marca';
        infoElement.textContent = infoTexto.join(' • ');
        infoElement.style.fontSize = '16px';
        infoElement.style.color = '#666';
        infoElement.style.marginTop = '10px';
        
        header.insertBefore(infoElement, totalPerfumes);
    }
}

/**
 * Salva informações no cache
 */
function salvarInfoMarcaCache(marca, info) {
    try {
        const cache = JSON.parse(localStorage.getItem('marcasCache') || '{}');
        cache[marca.toLowerCase()] = {
            ...info,
            timestamp: Date.now()
        };
        localStorage.setItem('marcasCache', JSON.stringify(cache));
        console.log('💾 Informações salvas no cache');
    } catch (error) {
        console.error('Erro ao salvar cache:', error);
    }
}

/**
 * Busca informações no cache
 */
function buscarInfoMarcaCache(marca) {
    try {
        const cache = JSON.parse(localStorage.getItem('marcasCache') || '{}');
        const info = cache[marca.toLowerCase()];
        
        // Cache válido por 30 dias
        if (info && (Date.now() - info.timestamp) < 30 * 24 * 60 * 60 * 1000) {
            return info;
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao ler cache:', error);
        return null;
    }
}

/**
 * Atualiza estatísticas
 */
function atualizarEstatisticas() {
    const tenho = perfumesData.filter(p => p.status === 'tenho').length;
    const jaTive = perfumesData.filter(p => p.status === 'ja-tive').length;
    const queroTer = perfumesData.filter(p => p.status === 'quero-ter').length;
    
    // Calcula média de avaliações (apenas dos que têm avaliação)
    const perfumesComAvaliacao = perfumesData.filter(p => p.avaliacoes && p.avaliacoes.media);
    let media = 0;
    
    if (perfumesComAvaliacao.length > 0) {
        const somaAvaliacoes = perfumesComAvaliacao.reduce((acc, p) => acc + p.avaliacoes.media, 0);
        media = somaAvaliacoes / perfumesComAvaliacao.length;
    }
    
    // Atualiza DOM
    document.getElementById('stat-tenho').textContent = tenho;
    document.getElementById('stat-ja-tive').textContent = jaTive;
    document.getElementById('stat-quero-ter').textContent = queroTer;
    document.getElementById('stat-media').textContent = media > 0 ? media.toFixed(1) : '-';
}

/**
 * Configura eventos
 */
function configurarEventos() {
    // Filtros
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
    
    // 2. Ordenar
    ordenarPerfumes();
    
    // 3. Renderizar
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
    
    perfumesFiltrados.forEach(perfume => {
        const card = criarCardPerfume(perfume);
        grid.appendChild(card);
    });
}

/**
 * Cria card de perfume
 */
function criarCardPerfume(perfume) {
    const card = document.createElement('div');
    card.className = 'perfume-card';
    
    card.onclick = () => {
        window.location.href = `../perfumes/perfume.html?id=${perfume.id}`;
    };
    
    // Foto
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
    
    // Nome
    const nome = document.createElement('div');
    nome.className = 'perfume-nome';
    nome.textContent = perfume.nome;
    nome.title = perfume.nome;
    
    // Status badge
    const status = document.createElement('span');
    status.className = 'perfume-status';
    
    if (perfume.status === 'tenho') {
        status.classList.add('status-tenho');
        status.textContent = 'Tenho';
    } else if (perfume.status === 'ja-tive') {
        status.classList.add('status-ja-tive');
        status.textContent = 'Já tive';
    } else if (perfume.status === 'quero-ter') {
        status.classList.add('status-quero-ter');
        status.textContent = 'Quero ter';
    }
    
    card.appendChild(foto);
    card.appendChild(nome);
    if (perfume.status) {
        card.appendChild(status);
    }
    
    return card;
}