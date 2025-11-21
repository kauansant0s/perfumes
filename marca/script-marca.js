// marca/script-marca.js - COM EDIÇÃO ADMIN
// marca/script-marca.js
import { auth, buscarPerfumes, db, buscarPaises, salvarPais, invalidarCachePaises } from '../adicionar-perfume/firebase-config.js';
import { collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { toggleLoading, criarPlaceholder } from '../adicionar-perfume/utils.js';

console.log('=== Script marca carregado ===');

let perfumesData = [];
let perfumesFiltrados = [];
let usuarioAtual = null;
let nomeMarca = '';
let marcaId = null;
let filtroAtual = 'todos';
let filtroGeneroAtual = 'todos';
let visualizacaoAtual = 'grid';
let ordenacaoAtual = 'nome-asc';
let paisesDisponiveis = [];

// ✅ EMAIL DO ADMIN (seu email)
const EMAIL_ADMIN = 'kauankssantos.12@gmail.com'; // ⚠️ ALTERE AQUI!

const urlParams = new URLSearchParams(window.location.search);
nomeMarca = urlParams.get('nome');

if (!nomeMarca) {
    alert('Nome da marca não encontrado!');
    window.location.href = '../perfil/perfil.html';
}

nomeMarca = decodeURIComponent(nomeMarca);
console.log('📍 Marca:', nomeMarca);

// Configurar menu
const menuHamburger = document.getElementById('menu-toggle');
const menuLateral = document.getElementById('menu-lateral');
const menuOverlay = document.getElementById('menu-overlay');

if (menuHamburger) {
    menuHamburger.addEventListener('click', () => {
        menuLateral.classList.toggle('aberto');
        menuOverlay.classList.toggle('ativo');
    });
}

if (menuOverlay) {
    menuOverlay.addEventListener('click', () => {
        menuLateral.classList.remove('aberto');
        menuOverlay.classList.remove('ativo');
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioAtual = user;
        console.log('✅ Usuário logado:', user.email);
        
        configurarMenuLateral(user);
        
        toggleLoading(true);
        
        try {
            // ✅ DEBUG: Testa carregar países
            console.log('📡 Tentando carregar países...');
            
            try {
                paisesDisponiveis = await buscarPaises();
                console.log(`✅ ${paisesDisponiveis.length} países carregados`);
            } catch (erroPaises) {
                console.error('❌ ERRO ao carregar países:', erroPaises);
                console.error('Tipo do erro:', erroPaises.name);
                console.error('Mensagem:', erroPaises.message);
                console.error('Stack:', erroPaises.stack);
                // Continua mesmo com erro nos países
                paisesDisponiveis = [];
            }
            
            // ✅ DEBUG: Testa carregar perfumes
            console.log('📡 Tentando carregar perfumes da marca...');
            
            try {
                await carregarPerfumesDaMarca();
                console.log('✅ Perfumes carregados com sucesso!');
            } catch (erroPerfumes) {
                console.error('❌ ERRO ao carregar perfumes:', erroPerfumes);
                console.error('Tipo do erro:', erroPerfumes.name);
                console.error('Mensagem:', erroPerfumes.message);
                console.error('Stack:', erroPerfumes.stack);
                throw erroPerfumes; // Re-lança o erro para mostrar na tela
            }
            
        } catch (error) {
            console.error('❌ Erro GERAL ao inicializar:', error);
            alert('❌ Erro ao carregar perfumes da marca.\n\nVeja o console (F12) para mais detalhes.\n\nErro: ' + error.message);
        } finally {
            toggleLoading(false);
        }
        
        configurarEventos();
        
    } else {
        window.location.href = '../login/login.html';
    }
});

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
                }
            }
        });
    }
}

async function carregarPerfumesDaMarca() {
    try {
        console.log('📡 Buscando perfumes da marca:', nomeMarca);
        
        const todosPerfumes = await buscarPerfumes(usuarioAtual.uid, true);
        
        perfumesData = todosPerfumes.filter(p => 
            p.marca && p.marca.toLowerCase() === nomeMarca.toLowerCase()
        );
        
        console.log(`✅ ${perfumesData.length} perfumes encontrados da marca ${nomeMarca}`);
        
        await atualizarHeader();
        atualizarEstatisticas();
        aplicarFiltrosEOrdenacao();
        
    } catch (error) {
        console.error('❌ Erro ao carregar perfumes:', error);
        throw error;
    }
}

async function atualizarHeader() {
    document.getElementById('nome-marca').textContent = nomeMarca;
    
    const logoTemp = nomeMarca.substring(0, 3).toUpperCase();
    document.getElementById('logo-texto').textContent = logoTemp;
    
    // ✅ CORRIGIDO: Singular/Plural
    const totalPerfumes = perfumesData.length;
    const textoPerfumes = totalPerfumes === 1 ? 'perfume' : 'perfumes';
    document.getElementById('total-perfumes').textContent = totalPerfumes;
    
    const totalPerfumesElement = document.querySelector('.total-perfumes');
    if (totalPerfumesElement) {
        totalPerfumesElement.innerHTML = `<span id="total-perfumes">${totalPerfumes}</span> ${textoPerfumes} em seu catálogo`;
    }
    
    document.title = `${nomeMarca} - Marca`;
    
    await buscarInfoMarcaFirebase();
}

async function buscarInfoMarcaFirebase() {
    try {
        console.log('📡 Buscando informações da marca no Firebase...');
        
        const marcasRef = collection(db, "marcas");
        const q = query(marcasRef, where("nome", "==", nomeMarca));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log('⚠️ Marca não encontrada no Firebase');
            return;
        }
        
        const marcaDoc = querySnapshot.docs[0];
        marcaId = marcaDoc.id;
        const marcaData = marcaDoc.data();
        
        console.log('✅ Informações da marca encontradas:', marcaData);
        
        // Aplica informações
        if (marcaData.logo && marcaData.logo.trim() !== '') {
            atualizarLogo(marcaData.logo);
        }
        
        if (marcaData.site && marcaData.site.trim() !== '') {
            mostrarBotaoSite(marcaData.site);
        }
        
        if (marcaData.pais || marcaData.anoFundacao) {
            adicionarInfoExtra(marcaData);
        }
        
        // ✅ Se for admin, mostra botão de edição
        if (usuarioAtual.email === EMAIL_ADMIN) {
            mostrarBotaoEditarAdmin(marcaData);
            if (!marcaData.site || !marcaData.logo) {
                console.log('📝 Marca nova sem informações completas, abrindo modal...');
                
                // Aguarda um pouco para garantir que tudo carregou
                setTimeout(() => {
                    abrirModalEditarMarca(marcaData);
                }, 800);
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar informações da marca:', error);
    }
}

/**
 * ✅ NOVO: Mostra botão de edição para admin
 */
function mostrarBotaoEditarAdmin(marcaData) {
    const header = document.querySelector('.header');
    
    // Remove botão existente se houver
    const btnExistente = document.getElementById('btn-editar-marca-admin');
    if (btnExistente) btnExistente.remove();
    
    const btnEditar = document.createElement('button');
    btnEditar.id = 'btn-editar-marca-admin';
    btnEditar.className = 'btn-editar-marca-admin';
    btnEditar.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
        Editar Info da Marca
    `;
    
    btnEditar.onclick = () => abrirModalEditarMarca(marcaData);
    
    // Adiciona depois do nome da marca
    const nomeMarca = document.getElementById('nome-marca');
    nomeMarca.insertAdjacentElement('afterend', btnEditar);
}

/**
 * ✅ NOVO: Modal para editar informações da marca
 */
function abrirModalEditarMarca(marcaData) {
    // Remove modal existente se houver
    const modalExistente = document.getElementById('modal-editar-marca');
    if (modalExistente) modalExistente.remove();
    
    const modal = document.createElement('div');
    modal.id = 'modal-editar-marca';
    modal.className = 'modal-editar-marca';
    modal.innerHTML = `
        <div class="modal-editar-marca-content">
            <span class="close-modal-marca">&times;</span>
            <h2>Editar Informações da Marca</h2>
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
                Cole os links abaixo. Deixe em branco para não alterar.
            </p>
            
            <div class="campo-modal">
                <label>Link do Site Oficial:</label>
                <input type="url" id="input-site-marca" placeholder="https://exemplo.com" value="${marcaData.site || ''}">
            </div>
            
            <div class="campo-modal">
                <label>Link da Logo (imagem):</label>
                <input type="url" id="input-logo-marca" placeholder="https://exemplo.com/logo.png" value="${marcaData.logo || ''}">
                <small style="color: #666; font-size: 12px;">Dica: Procure por "logo PNG" no Google</small>
            </div>
            
            <div class="campo-modal">
                <label>País de Origem:</label>
                <input type="text" 
                       id="input-pais-marca" 
                       list="paises-list"
                       placeholder="Ex: França" 
                       value="${marcaData.pais || ''}"
                       autocomplete="off">
                <datalist id="paises-list"></datalist>
            </div>
            
            <div class="campo-modal">
                <label>Ano de Fundação:</label>
                <input type="text" id="input-ano-marca" placeholder="Ex: 1921" value="${marcaData.anoFundacao || ''}">
            </div>
            
            <div class="botoes-modal">
                <button class="btn-cancelar-modal" id="btn-cancelar-editar">Cancelar</button>
                <button class="btn-salvar-modal" id="btn-salvar-editar">Salvar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // ✅ Popula datalist com países
    const datalist = document.getElementById('paises-list');
    paisesDisponiveis.forEach(pais => {
        const option = document.createElement('option');
        option.value = pais;
        datalist.appendChild(option);
    });
    
    // Event listeners
    const closeBtn = modal.querySelector('.close-modal-marca');
    closeBtn.onclick = () => modal.remove();
    
    const btnCancelar = document.getElementById('btn-cancelar-editar');
    btnCancelar.onclick = () => modal.remove();
    
    const btnSalvar = document.getElementById('btn-salvar-editar');
    btnSalvar.onclick = () => salvarInfoMarca();
    
    // Fecha ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    modal.style.display = 'flex';
}

/**
 * ✅ NOVO: Salva informações da marca
 */
async function salvarInfoMarca() {
    const site = document.getElementById('input-site-marca').value.trim();
    const logo = document.getElementById('input-logo-marca').value.trim();
    const pais = document.getElementById('input-pais-marca').value.trim();
    const ano = document.getElementById('input-ano-marca').value.trim();
    
    // Validações básicas
    if (site && !site.startsWith('http')) {
        alert('❌ O link do site deve começar com http:// ou https://');
        return;
    }
    
    if (logo && !logo.startsWith('http')) {
        alert('❌ O link da logo deve começar com http:// ou https://');
        return;
    }
    
    if (ano && (!/^\d{4}$/.test(ano) || parseInt(ano) < 1500 || parseInt(ano) > 2025)) {
        alert('❌ Ano inválido. Use formato: 1921');
        return;
    }
    
    try {
        toggleLoading(true);
        
        // ✅ Salva país se for novo
        if (pais && pais.trim() !== '') {
            const paisTrimmed = pais.trim();
            
            if (!paisesDisponiveis.includes(paisTrimmed)) {
                console.log('📝 Novo país detectado:', paisTrimmed);
                await salvarPais(paisTrimmed);
                paisesDisponiveis.push(paisTrimmed);
                paisesDisponiveis.sort();
                console.log('✅ Novo país adicionado:', paisTrimmed);
            }
        }
        
        const dadosParaAtualizar = {};
        if (site) dadosParaAtualizar.site = site;
        if (logo) dadosParaAtualizar.logo = logo;
        if (pais) dadosParaAtualizar.pais = pais;
        if (ano) dadosParaAtualizar.anoFundacao = ano;
        
        if (Object.keys(dadosParaAtualizar).length === 0) {
            alert('⚠️ Nenhuma informação para atualizar');
            return;
        }
        
        const marcaRef = doc(db, "marcas", marcaId);
        await updateDoc(marcaRef, dadosParaAtualizar);
        
        console.log('✅ Informações salvas:', dadosParaAtualizar);
        
        // Remove modal
        document.getElementById('modal-editar-marca').remove();
        
        // Recarrega página para mostrar mudanças
        alert('✅ Informações atualizadas com sucesso!');
        location.reload();
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        alert('❌ Erro ao salvar informações: ' + error.message);
    } finally {
        toggleLoading(false);
    }
}

function atualizarLogo(urlLogo) {
    const logoElement = document.getElementById('logo-marca');
    const logoTexto = document.getElementById('logo-texto');
    
    const img = document.createElement('img');
    img.src = urlLogo;
    img.alt = `Logo ${nomeMarca}`;
    img.style.maxWidth = '80%';
    img.style.maxHeight = '80%';
    img.style.objectFit = 'contain';
    
    img.onload = () => {
        logoTexto.style.display = 'none';
        logoElement.appendChild(img);
        console.log('✅ Logo carregada');
    };
    
    img.onerror = () => {
        console.log('❌ Erro ao carregar logo');
    };
}

function mostrarBotaoSite(urlSite) {
    const btnSite = document.getElementById('btn-site-oficial');
    if (btnSite) {
        btnSite.href = urlSite;
        btnSite.style.display = 'inline-flex';
    }
}

function adicionarInfoExtra(marcaData) {
    const header = document.querySelector('.header');
    const totalPerfumes = document.querySelector('.total-perfumes');
    
    let infoTexto = [];
    if (marcaData.pais) infoTexto.push(marcaData.pais);
    if (marcaData.anoFundacao) infoTexto.push(`Fundada em ${marcaData.anoFundacao}`);
    
    if (infoTexto.length > 0) {
        const infoExistente = header.querySelector('.info-marca');
        if (infoExistente) infoExistente.remove();
        
        const infoElement = document.createElement('p');
        infoElement.className = 'info-marca';
        infoElement.textContent = infoTexto.join(' • ');
        infoElement.style.fontSize = '16px';
        infoElement.style.color = '#000000ff';
        infoElement.style.marginTop = '10px';
        
        header.insertBefore(infoElement, totalPerfumes);
    }
}

function atualizarEstatisticas() {
    const tenho = perfumesData.filter(p => p.status === 'tenho').length;
    const jaTive = perfumesData.filter(p => p.status === 'ja-tive').length;
    const queroTer = perfumesData.filter(p => p.status === 'quero-ter').length;
    
    const perfumesComAvaliacao = perfumesData.filter(p => p.avaliacoes && p.avaliacoes.media);
    let media = 0;
    
    if (perfumesComAvaliacao.length > 0) {
        const somaAvaliacoes = perfumesComAvaliacao.reduce((acc, p) => acc + p.avaliacoes.media, 0);
        media = somaAvaliacoes / perfumesComAvaliacao.length;
    }
    
    document.getElementById('stat-tenho').textContent = tenho;
    document.getElementById('stat-ja-tive').textContent = jaTive;
    document.getElementById('stat-quero-ter').textContent = queroTer;
    document.getElementById('stat-media').textContent = media > 0 ? media.toFixed(1) : '-';
}

function configurarEventos() {
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            filtroAtual = btn.dataset.filtro;
            aplicarFiltrosEOrdenacao();
        });
    });
    
    document.getElementById('ordenar').addEventListener('change', (e) => {
        ordenacaoAtual = e.target.value;
        aplicarFiltrosEOrdenacao();
    });

    document.querySelectorAll('.btn-filtro-genero').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-filtro-genero').forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            filtroGeneroAtual = btn.dataset.genero;
            aplicarFiltrosEOrdenacao();
        });
    });

    // ✅ NOVO: Toggle de visualização
    document.querySelectorAll('.btn-visualizacao').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-visualizacao').forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            visualizacaoAtual = btn.dataset.view;
            atualizarVisualizacao();
        });
    });
}

/**
 * ✅ NOVA: Atualiza modo de visualização (grid/lista)
 */
function atualizarVisualizacao() {
    const grid = document.getElementById('grid-perfumes');
    
    if (visualizacaoAtual === 'lista') {
        grid.classList.add('lista');
        console.log('📋 Visualização em lista ativada');
    } else {
        grid.classList.remove('lista');
        console.log('🔲 Visualização em grid ativada');
    }
}

function aplicarFiltrosEOrdenacao() {
    // 1. Filtrar por status
    if (filtroAtual === 'todos') {
        perfumesFiltrados = [...perfumesData];
    } else {
        perfumesFiltrados = perfumesData.filter(p => p.status === filtroAtual);
    }
    
    // ✅ NOVO: 2. Filtrar por gênero
    if (filtroGeneroAtual !== 'todos') {
        perfumesFiltrados = perfumesFiltrados.filter(p => {
            if (!p.caracteristicas || !p.caracteristicas.genero) {
                return false;
            }
            
            const genero = p.caracteristicas.genero;
            
            if (filtroGeneroAtual === 'masculino') {
                return genero === 'masculino' || genero === 'um-pouco-masculino';
            } else if (filtroGeneroAtual === 'feminino') {
                return genero === 'feminino' || genero === 'um-pouco-feminino';
            } else if (filtroGeneroAtual === 'compartilhavel') {
                return genero === 'compartilhavel';
            }
            
            return false;
        });
    }
    
    // 3. Ordenar
    ordenarPerfumes();
    
    // 4. Renderizar
    renderizarPerfumes();
}

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

function criarCardPerfume(perfume) {
    const card = document.createElement('div');
    card.className = 'perfume-card';
    
    // ✅ NOVO: Usa <a> ao invés de onclick
    const link = document.createElement('a');
    link.href = `../perfumes/perfume.html?id=${perfume.id}`;
    link.setAttribute('aria-label', `Ver detalhes de ${perfume.nome}`);
    
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
    
    // ✅ Adiciona símbolo de gênero
    let nomeComGenero = perfume.nome;
    if (perfume.caracteristicas && perfume.caracteristicas.genero) {
      const genero = perfume.caracteristicas.genero;
      let simbolo = '';
      
      if (genero === 'masculino' || genero === 'um-pouco-masculino') {
        simbolo = ' ♂';
      } else if (genero === 'feminino' || genero === 'um-pouco-feminino') {
        simbolo = ' ♀';
      } else if (genero === 'compartilhavel') {
        simbolo = ' ⚥';
      }
      
      nomeComGenero += simbolo;
    }
    
    nome.textContent = nomeComGenero;
    nome.title = perfume.nome;
    
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
    
    link.appendChild(foto);
    link.appendChild(nome);
    if (perfume.status) {
        link.appendChild(status);
    }
    
    card.appendChild(link);
    
    return card;
}