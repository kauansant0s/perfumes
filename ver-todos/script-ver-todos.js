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
let visualizacaoAtual = 'grid';

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

// Aplica filtros e ordenação
function aplicarFiltrosEOrdenacao() {
    // 1. Filtrar por status
    if (filtroAtual === 'todos') {
        // ✅ Mostra perfumes com status OU que foram avaliados
        perfumesFiltrados = perfumesData.filter(p => 
            p.status === 'tenho' || 
            p.status === 'ja-tive' || 
            p.status === 'quero-ter' ||
            (p.avaliacoes && p.avaliacoes.media && p.avaliacoes.media > 0)
        );
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
    
    // ✅ Container de informações (nome + marca)
    const infoContainer = document.createElement('div');
    infoContainer.className = 'perfume-info';
    
    const nome = document.createElement('div');
    nome.className = 'perfume-nome';
    nome.textContent = perfume.nome;
    
    // ✅ Adiciona símbolo de gênero COLORIDO
    if (perfume.caracteristicas && perfume.caracteristicas.genero) {
      const genero = perfume.caracteristicas.genero;
      let simbolo = '';
      let classeGenero = '';
      
      if (genero === 'masculino' || genero === 'um-pouco-masculino') {
        simbolo = '♂';
        classeGenero = 'masculino';
      } else if (genero === 'feminino' || genero === 'um-pouco-feminino') {
        simbolo = '♀';
        classeGenero = 'feminino';
      } else if (genero === 'compartilhavel') {
        simbolo = '⚥';
        classeGenero = 'unissex';
      }
      
      if (simbolo) {
        const spanSimbolo = document.createElement('span');
        spanSimbolo.className = `simbolo-genero ${classeGenero}`;
        spanSimbolo.textContent = simbolo;
        nome.appendChild(spanSimbolo);
      }
    }
    
    nome.title = perfume.nome;
    
    // ✅ Adiciona marca (só aparece em visualização lista)
    const marca = document.createElement('div');
    marca.className = 'perfume-marca';
    marca.textContent = perfume.marca || '';
    
    infoContainer.appendChild(nome);
    infoContainer.appendChild(marca);
    
    link.appendChild(foto);
    link.appendChild(infoContainer);
    card.appendChild(link);
    
    return card;
}

// ✅ Sistema de Pesquisa Animada
(function() {
    const btnToggle = document.getElementById('btn-pesquisa-toggle');
    const barraPesquisa = document.getElementById('barra-pesquisa');
    const inputPesquisa = document.getElementById('input-pesquisa-global');
    const resultadosDiv = document.getElementById('resultados-pesquisa');
    const overlay = document.getElementById('pesquisa-overlay');
    
    let pesquisaAberta = false;
    let timeoutPesquisa;
    
    // Toggle pesquisa
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            pesquisaAberta = !pesquisaAberta;
            
            if (pesquisaAberta) {
                barraPesquisa.classList.add('expandida');
                overlay.classList.add('ativo');
                setTimeout(() => inputPesquisa.focus(), 400);
            } else {
                fecharPesquisa();
            }
        });
    }
    
    // Fecha pesquisa
    function fecharPesquisa() {
        pesquisaAberta = false;
        barraPesquisa.classList.remove('expandida');
        resultadosDiv.classList.remove('mostrar');
        overlay.classList.remove('ativo');
        inputPesquisa.value = '';
    }
    
    // Overlay fecha pesquisa
    if (overlay) {
        overlay.addEventListener('click', fecharPesquisa);
    }
    
    // ESC fecha pesquisa
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pesquisaAberta) {
            fecharPesquisa();
        }
    });
    
    // Pesquisa com debounce
    if (inputPesquisa) {
        inputPesquisa.addEventListener('input', (e) => {
            clearTimeout(timeoutPesquisa);
            
            const termo = e.target.value.toLowerCase().trim();
            
            if (!termo) {
                resultadosDiv.classList.remove('mostrar');
                return;
            }
            
            timeoutPesquisa = setTimeout(() => {
                realizarPesquisa(termo);
            }, 300);
        });
    }
    
    // Realiza pesquisa
    async function realizarPesquisa(termo) {
        try {
            // Busca perfumes
            const perfumesFiltrados = perfumesData.filter(p => 
                p.nome.toLowerCase().includes(termo) ||
                p.marca.toLowerCase().includes(termo)
            );
            
            // Busca marcas únicas com logo
            const marcasUnicas = new Map();
            
            // ✅ Primeiro, identifica marcas únicas
            perfumesData.forEach(p => {
                if (p.marca.toLowerCase().includes(termo)) {
                    if (!marcasUnicas.has(p.marca)) {
                        marcasUnicas.set(p.marca, {
                            nome: p.marca,
                            qtd: perfumesData.filter(pf => pf.marca === p.marca).length,
                            logo: null // Será carregado depois
                        });
                    }
                }
            });
            
            const marcasFiltradas = Array.from(marcasUnicas.values());
            
            // ✅ Busca logos das marcas no Firebase
            if (marcasFiltradas.length > 0) {
                try {
                    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                    const { db } = await import('../adicionar-perfume/firebase-config.js');
                    
                    for (const marca of marcasFiltradas) {
                        const q = query(collection(db, "marcas"), where("nome", "==", marca.nome));
                        const querySnapshot = await getDocs(q);
                        
                        if (!querySnapshot.empty) {
                            const marcaData = querySnapshot.docs[0].data();
                            if (marcaData.logo) {
                                marca.logo = marcaData.logo;
                            }
                        }
                    }
                } catch (error) {
                    console.log('⚠️ Erro ao buscar logos:', error);
                }
            }
            
            // Renderiza resultados
            renderizarResultados(perfumesFiltrados, marcasFiltradas, termo);
            
        } catch (error) {
            console.error('Erro ao pesquisar:', error);
        }
    }
    
    // Renderiza resultados
    function renderizarResultados(perfumes, marcas, termo) {
        let html = '';
        
        if (perfumes.length === 0 && marcas.length === 0) {
            html = `<div class="sem-resultados">Nenhum resultado para "<strong>${termo}</strong>"</div>`;
        } else {
            // Perfumes
            if (perfumes.length > 0) {
                html += `
                    <div class="secao-resultado">
                        <h3>Perfumes (${perfumes.length})</h3>
                `;
                
                perfumes.slice(0, 5).forEach(p => {
                    html += `
                        <a href="../perfumes/perfume.html?id=${p.id}" class="item-resultado">
                            <div class="resultado-foto">
                                ${p.fotoURL ? 
                                    `<img src="${p.fotoURL}" alt="${p.nome}">` :
                                    `<div class="resultado-foto-placeholder">${p.nome}</div>`
                                }
                            </div>
                            <div class="resultado-info">
                                <p class="resultado-nome">${p.nome}</p>
                                <p class="resultado-subtitulo">${p.marca}</p>
                            </div>
                        </a>
                    `;
                });
                
                html += `</div>`;
            }
            
            // Marcas
            if (marcas.length > 0) {
                html += `
                    <div class="secao-resultado">
                        <h3>Marcas (${marcas.length})</h3>
                `;
                
                marcas.slice(0, 5).forEach(m => {
                    // ✅ Logo: usa logo do Firebase ou iniciais
                    const logoHtml = m.logo ? 
                        `<img src="${m.logo}" alt="${m.nome}" style="width: 100%; height: 100%; object-fit: contain;">` :
                        `<div class="resultado-foto-placeholder" style="font-size: 16px; font-weight: 700; color: #666;">
                            ${m.nome.substring(0, 2).toUpperCase()}
                        </div>`;
                    
                    html += `
                        <a href="../marca/marca.html?nome=${encodeURIComponent(m.nome)}" 
                           class="item-resultado"
                           onclick="fecharPesquisa()">
                            <div class="resultado-foto" style="background: #fff;">
                                ${logoHtml}
                            </div>
                            <div class="resultado-info">
                                <p class="resultado-nome">${m.nome}</p>
                                <p class="resultado-subtitulo">${m.qtd} ${m.qtd === 1 ? 'perfume' : 'perfumes'}</p>
                            </div>
                        </a>
                    `;
                });
                
                html += `</div>`;
            }
        }
        
        resultadosDiv.innerHTML = html;
        resultadosDiv.classList.add('mostrar');
    }
})();