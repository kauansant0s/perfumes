// perfil/script-perfil.js - Otimizado
import { auth, buscarPerfumes, buscarPreferenciasUsuario, salvarPreferenciasUsuario } from '../adicionar-perfume/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { configurarMenuLateral, toggleLoading, criarPlaceholder } from '../adicionar-perfume/utils.js';

console.log('=== Script perfil carregado ===');

let perfumesData = [];
let usuarioAtual = null;
let preferenciasUsuario = null;

const coresAcordes = {
  'Abaunilhado': '#D4A574', 'Aldeídico': '#E8E8E8', 'Alcoólico': '#C9B8A8',
  'Almiscarado': '#F5E6D3', 'Ambarado': '#FFB347', 'Amadeirado': '#8B4513',
  'Animálico': '#654321', 'Aquático': '#4DD0E1', 'Aromático': '#7CB342',
  'Assabonetado': '#E0F7FA', 'Atalcado': '#E8D5C4', 'Balsâmico': '#8B7355',
  'Chipre': '#556B2F', 'Cítrico': '#FFA500', 'Couro': '#654321', 'Cremoso': '#FFF8DC',
  'Doce': '#FFB6C1', 'Esfumaçado': '#696969', 'Especiado': '#CD853F', 'Floral': '#FF69B4',
  'Floral Amarelo': '#FFD700', 'Floral Branco': '#F5F5F5', 'Fougère': '#2E8B57',
  'Fresco': '#87CEEB', 'Frutado': '#FF6347', 'Gourmand': '#D2691E',
  'Herbal': '#6B8E23', 'Lactônico': '#FFF5EE', 'Limpeza': '#B2DFDB',
  'Metálico': '#B0B0B0', 'Resinoso': '#A0522D', 'Terroso': '#8B7355',
  'Tropical': '#FF8C00', 'Verde': '#228B22'
};

// Verifica se o usuário está logado
onAuthStateChanged(auth, async (user) => {
  console.log('=== onAuthStateChanged disparado ===');
  
  if (user) {
    usuarioAtual = user;
    console.log('✅ Usuário logado:', user.email);
    
    // Atualiza nome do usuário
    const nomeUsuario = user.displayName || 'Usuário';
    document.getElementById('nome-usuario').textContent = nomeUsuario;
    
    // Atualiza foto
    const fotoElement = document.getElementById('foto-perfil');
    if (user.photoURL) {
      fotoElement.src = user.photoURL;
    } else {
      fotoElement.src = criarPlaceholder(nomeUsuario.charAt(0), 180);
    }
    
    // Configura menu lateral (usando função compartilhada)
    configurarMenuLateral(auth, user);
    
    // Carrega dados com loading
    toggleLoading(true);
    
    try {
      console.log('📡 Carregando dados...');
      await carregarPreferencias();
      await carregarPerfumes();
      console.log('✅ Dados carregados com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      alert('Erro ao carregar dados: ' + error.message);
    } finally {
      toggleLoading(false);
    }
  } else {
    console.log('❌ Usuário não autenticado');
    window.location.href = '../login/login.html';
  }
});

/**
 * Carrega preferências do usuário
 */
async function carregarPreferencias() {
  try {
    console.log('  → Buscando preferências...');
    preferenciasUsuario = await buscarPreferenciasUsuario(usuarioAtual.uid);
    
    if (preferenciasUsuario) {
      if (preferenciasUsuario.assinaturaAtual) {
        carregarAssinaturaAtual(preferenciasUsuario.assinaturaAtual);
      }
    } else {
      preferenciasUsuario = { top5: [] };
    }
  } catch (error) {
    console.error('❌ Erro ao carregar preferências:', error);
    preferenciasUsuario = { top5: [] };
    throw error;
  }
}

/**
 * Carrega perfumes do usuário
 */
async function carregarPerfumes() {
  try {
    console.log('  → Buscando perfumes...');
    perfumesData = await buscarPerfumes(usuarioAtual.uid, true); // usa cache
    console.log(`  ✅ ${perfumesData.length} perfumes encontrados`);
    
    renderizarPerfumes();
    
    // Renderiza Top 5
    if (preferenciasUsuario?.top5 && preferenciasUsuario.top5.length > 0) {
      renderizarTop5(preferenciasUsuario.top5);
    } else {
      renderizarTop5Vazio();
    }
    
    // Configura placeholder de assinatura se necessário
    if (!preferenciasUsuario?.assinaturaAtual) {
      const placeholder = document.querySelector('.perfume-placeholder');
      if (placeholder) {
        placeholder.parentElement.style.cursor = 'pointer';
        placeholder.parentElement.onclick = abrirModalAssinatura;
      }
    }
  } catch (error) {
    console.error('❌ Erro ao carregar perfumes:', error);
    throw error;
  }
}

/**
 * Renderiza perfumes nas seções
 */
function renderizarPerfumes() {
  const tenho = perfumesData.filter(p => p.status === 'tenho');
  const jaTive = perfumesData.filter(p => p.status === 'ja-tive');
  const queroTer = perfumesData.filter(p => p.status === 'quero-ter');
  
  // ✅ NOVO: "Todos" mostra APENAS perfumes COM status
  const todos = perfumesData.filter(p => 
    p.status === 'tenho' || 
    p.status === 'ja-tive' || 
    p.status === 'quero-ter'
  );
  
  renderizarSecao('tenho', tenho);
  renderizarSecao('ja-tive', jaTive);
  renderizarSecao('quero-ter', queroTer);
  renderizarSecao('todos', todos); // ← Agora usa a variável 'todos' filtrada
}

/**
 * Renderiza uma seção de perfumes
 */
function renderizarSecao(secaoId, perfumes) {
  const secao = document.getElementById(secaoId);
  if (!secao) return;
  
  secao.innerHTML = '';
  
  // Mostra até 7 perfumes
  perfumes.slice(0, 7).forEach(perfume => {
    const card = criarCardPerfume(perfume);
    secao.appendChild(card);
  });
  
  // Botão adicionar ou ver todos
  if (perfumes.length < 7) {
    const btnAdicionar = document.createElement('button');
    btnAdicionar.className = 'btn-adicionar-perfume';
    btnAdicionar.textContent = '+';
    btnAdicionar.setAttribute('aria-label', 'Adicionar perfume');
    btnAdicionar.onclick = () => abrirModalAdicionar(secaoId);
    secao.appendChild(btnAdicionar);
  } else {
    const btnVerTodos = document.createElement('button');
    btnVerTodos.className = 'btn-ver-todos';
    btnVerTodos.textContent = 'Ver todos';
    btnVerTodos.setAttribute('aria-label', `Ver todos os perfumes da categoria ${secaoId}`);
    
    btnVerTodos.onclick = () => {
      let filtro = 'todos';
      if (secaoId === 'tenho') filtro = 'tenho';
      else if (secaoId === 'ja-tive') filtro = 'ja-tive';
      else if (secaoId === 'quero-ter') filtro = 'quero-ter';
      
      window.location.href = `../ver-todos/ver-todos.html?filtro=${filtro}`;
    };
    
    secao.appendChild(btnVerTodos);
  }
}

/**
 * Cria card de perfume
 */
function criarCardPerfume(perfume) {
  const card = document.createElement('div');
  card.className = 'perfume-card';
    
  // ✅ Torna draggable
  card.setAttribute('draggable', 'true');
  card.setAttribute('data-perfume-id', perfume.id);
    
  // Event listeners de drag
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('perfume-id', perfume.id);
    e.dataTransfer.setData('status-origem', perfume.status || '');
    card.classList.add('dragging');
  });
    
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });
    
  // ✅ Link
  const link = document.createElement('a');
  link.href = `../perfumes/perfume.html?id=${perfume.id}`;
  link.style.display = 'block';
  link.style.width = '100%';
  link.style.height = '100%';
  link.style.textDecoration = 'none';
  link.style.color = 'inherit';
  
  // ✅ Acessibilidade
  link.setAttribute('aria-label', `Ver detalhes de ${perfume.nome}`);
  link.setAttribute('tabindex', '0');
  
  if (perfume.fotoURL && perfume.fotoURL.trim() !== '') {
    const img = document.createElement('img');
    img.src = perfume.fotoURL;
    img.alt = perfume.nome;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    
    img.onerror = () => {
      link.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#666;text-align:center;padding:5px;background:#d9d9d9;">${perfume.nome}</div>`;
    };
    
    link.appendChild(img);
  } else {
    link.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#666;text-align:center;padding:5px;background:#d9d9d9;">${perfume.nome}</div>`;
  }
  
  card.appendChild(link);
  return card;
}

/**
 * Renderiza Top 5
 */
function renderizarTop5(top5Ids) {
  const secao = document.getElementById('top5');
  if (!secao) return;
  
  secao.innerHTML = '';
  
  const perfumesTop5 = perfumesData.filter(p => top5Ids.includes(p.id));
  
  perfumesTop5.forEach(perfume => {
    // Wrapper para posicionar o X fora do card
    const wrapper = document.createElement('div');
    wrapper.className = 'top5-card-wrapper';

    const card = criarCardPerfume(perfume);

    const btnRemover = document.createElement('button');
    btnRemover.className = 'top5-remover';
    btnRemover.innerHTML = '&times;';
    btnRemover.title = 'Remover do Top 5';
    btnRemover.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      removerDoTop5(perfume.id);
    });

    wrapper.appendChild(card);
    wrapper.appendChild(btnRemover);
    secao.appendChild(wrapper);
  });
  
  if (perfumesTop5.length < 5) {
    const btnAdicionar = document.createElement('button');
    btnAdicionar.className = 'btn-adicionar-perfume';
    btnAdicionar.textContent = '+';
    btnAdicionar.setAttribute('aria-label', 'Adicionar ao Top 5');
    btnAdicionar.onclick = abrirModalTop5;
    secao.appendChild(btnAdicionar);
  }

  // Re-insere o botão editar sempre no final
  reinserirBtnEditar();
}

/**
 * Renderiza Top 5 vazio
 */
function renderizarTop5Vazio() {
  const secao = document.getElementById('top5');
  if (secao) {
    secao.innerHTML = '';
    const btnAdicionar = document.createElement('button');
    btnAdicionar.className = 'btn-adicionar-perfume';
    btnAdicionar.textContent = '+';
    btnAdicionar.setAttribute('aria-label', 'Adicionar ao Top 5');
    btnAdicionar.onclick = abrirModalTop5;
    secao.appendChild(btnAdicionar);
    reinserirBtnEditar();
  }
}

function reinserirBtnEditar() {
  const secao = document.getElementById('top5');
  if (!secao) return;
  // Remove qualquer botão editar existente antes de re-inserir
  const existente = secao.querySelector('.btn-editar-top5');
  if (existente) existente.remove();

  const btn = document.createElement('button');
  btn.id = 'btn-editar-top5';
  btn.className = 'btn-editar-top5';
  btn.title = 'Editar Top 5';
  btn.innerHTML = `<svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.125 13.875H6.01562L12.125 7.76562L11.2344 6.875L5.125 12.9844V13.875ZM3.875 15.125V12.4688L12.125 4.23437C12.25 4.11979 12.388 4.03125 12.5391 3.96875C12.6901 3.90625 12.849 3.875 13.0156 3.875C13.1823 3.875 13.3438 3.90625 13.5 3.96875C13.6563 4.03125 13.7917 4.125 13.9063 4.25L14.7656 5.125C14.8906 5.23958 14.9818 5.375 15.0391 5.53125C15.0964 5.6875 15.125 5.84375 15.125 6C15.125 6.16667 15.0964 6.32552 15.0391 6.47656C14.9818 6.6276 14.8906 6.76563 14.7656 6.89063L6.53125 15.125H3.875ZM11.6719 7.32813L11.2344 6.875L12.125 7.76562L11.6719 7.32813Z" fill="currentColor"/>
    <circle cx="9.5" cy="9.5" r="9" stroke="currentColor"/>
  </svg>`;
  btn.addEventListener('click', toggleModoEdicaoTop5);
  if (modoEdicaoTop5) btn.classList.add('ativo');
  secao.appendChild(btn);
}

/**
 * Liga/desliga modo edição do Top 5
 */
let modoEdicaoTop5 = false;

function toggleModoEdicaoTop5() {
  modoEdicaoTop5 = !modoEdicaoTop5;
  const secao = document.getElementById('top5');
  const btn = document.getElementById('btn-editar-top5');
  if (secao) secao.classList.toggle('modo-edicao', modoEdicaoTop5);
  if (btn) btn.classList.toggle('ativo', modoEdicaoTop5);
}

/**
 * Remove perfume do Top 5
 */
async function removerDoTop5(perfumeId) {
  const top5Atual = preferenciasUsuario?.top5 || [];
  const novoTop5 = top5Atual.filter(id => id !== perfumeId);

  preferenciasUsuario.top5 = novoTop5;

  // Re-renderiza mantendo modo edição
  renderizarTop5(novoTop5);

  // Re-adiciona X buttons e mantém modo edição ativo
  if (modoEdicaoTop5) {
    const secao = document.getElementById('top5');
    if (secao) secao.classList.add('modo-edicao');
  }

  try {
    await salvarPreferenciasUsuario(usuarioAtual.uid, {
      ...preferenciasUsuario,
      top5: novoTop5
    });
    console.log('✅ Top 5 atualizado');
  } catch (error) {
    console.error('❌ Erro ao salvar top5:', error);
  }
}

// Botão editar top5 é gerenciado dinamicamente por reinserirBtnEditar()

/**
 * Define assinatura atual
 */
async function definirAssinaturaAtual(perfume) {
  console.log('📝 Definindo assinatura:', perfume.nome);
  
  const container = document.getElementById('perfume-assinatura');
  container.innerHTML = '';
  
  const miniCard = document.createElement('div');
  miniCard.className = 'perfume-mini';
  miniCard.style.cursor = 'pointer';
  miniCard.onclick = abrirModalAssinatura;
  
  if (perfume.fotoURL && perfume.fotoURL.trim() !== '') {
    const img = document.createElement('img');
    img.src = perfume.fotoURL;
    img.alt = perfume.nome;
    miniCard.appendChild(img);
  } else {
    miniCard.style.background = '#d9d9d9';
    miniCard.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#666;text-align:center;padding:5px;">${perfume.nome}</div>`;
  }
  
  const nome = document.createElement('p');
  nome.id = 'nome-assinatura';
  nome.textContent = perfume.nome;
  
  container.appendChild(miniCard);
  container.appendChild(nome);
  
  toggleLoading(true);
  
  try {
    const agora = new Date().toISOString();
    const novaAssinatura = {
      id: perfume.id,
      nome: perfume.nome,
      fotoURL: perfume.fotoURL,
      inicio: agora
    };

    // Fecha o período da assinatura anterior no histórico
    const historico = preferenciasUsuario?.historicoAssinatura || [];
    const anterior = preferenciasUsuario?.assinaturaAtual;
    if (anterior && anterior.id !== perfume.id) {
      // Atualiza fim da entrada mais recente desse perfume sem fim definido
      const idxAnterior = [...historico].reverse().findIndex(h => h.id === anterior.id && !h.fim);
      if (idxAnterior >= 0) {
        historico[historico.length - 1 - idxAnterior].fim = agora;
      }
    }

    // Adiciona nova entrada no histórico
    historico.push({ id: perfume.id, nome: perfume.nome, fotoURL: perfume.fotoURL, inicio: agora, fim: null });

    await salvarPreferenciasUsuario(usuarioAtual.uid, {
      ...preferenciasUsuario,
      assinaturaAtual: novaAssinatura,
      historicoAssinatura: historico
    });

    if (!preferenciasUsuario) preferenciasUsuario = {};
    preferenciasUsuario.assinaturaAtual = novaAssinatura;
    preferenciasUsuario.historicoAssinatura = historico;
    
    console.log('✅ Assinatura salva!');
  } catch (error) {
    console.error('❌ Erro ao salvar assinatura:', error);
    alert('❌ ' + error.message);
  } finally {
    toggleLoading(false);
  }
}

/**
 * Carrega assinatura atual
 */
function carregarAssinaturaAtual(assinatura) {
  if (assinatura) {
    const container = document.getElementById('perfume-assinatura');
    container.innerHTML = '';
    
    const miniCard = document.createElement('div');
    miniCard.className = 'perfume-mini';
    miniCard.style.cursor = 'pointer';
    miniCard.onclick = abrirModalAssinatura;
    
    if (assinatura.fotoURL && assinatura.fotoURL.trim() !== '') {
      const img = document.createElement('img');
      img.src = assinatura.fotoURL;
      img.alt = assinatura.nome;
      miniCard.appendChild(img);
    } else {
      miniCard.style.background = '#d9d9d9';
      miniCard.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#666;text-align:center;padding:5px;">${assinatura.nome}</div>`;
    }
    
    const nome = document.createElement('p');
    nome.id = 'nome-assinatura';
    nome.textContent = assinatura.nome;

    // Botão histórico
    const btnHistorico = document.createElement('button');
    btnHistorico.className = 'btn-ver-historico';
    btnHistorico.title = 'Ver histórico de assinatura';
    btnHistorico.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    btnHistorico.addEventListener('click', abrirHistoricoAssinatura);
    nome.appendChild(btnHistorico);
    
    container.appendChild(miniCard);
    container.appendChild(nome);
  }
}

// Abre modal para escolher assinatura
function abrirModalAssinatura() {
  const modal = document.getElementById('modal-top5');
  const lista = document.getElementById('lista-perfumes-top5');
  const titulo = document.getElementById('titulo-modal-top5');
  const inputPesquisa = document.getElementById('pesquisa-top5');
  
  titulo.textContent = 'Escolher assinatura atual';
  lista.innerHTML = '';
  
  if (inputPesquisa) {
    inputPesquisa.value = '';
  }
  
  // ✅ Função para renderizar perfumes (com filtro opcional)
  function renderizarPerfumesAssinatura(termoPesquisa = '') {
    lista.innerHTML = '';
    
    if (perfumesData.length === 0) {
      lista.innerHTML = '<p style="text-align:center;color:#666;">Você ainda não cadastrou nenhum perfume</p>';
      return;
    }
    
    // Filtra perfumes se houver termo de pesquisa
    let perfumesFiltrados = perfumesData;
    if (termoPesquisa) {
      const termo = termoPesquisa.toLowerCase();
      perfumesFiltrados = perfumesData.filter(p => 
        p.nome.toLowerCase().includes(termo) ||
        p.marca.toLowerCase().includes(termo)
      );
    }
    
    if (perfumesFiltrados.length === 0) {
      lista.innerHTML = `
        <div class="sem-resultados-modal">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <p>Nenhum perfume encontrado para "<strong>${termoPesquisa}</strong>"</p>
        </div>
      `;
      return;
    }
    
    perfumesFiltrados.forEach(perfume => {
      const card = criarCardModal(perfume, async () => {
        await definirAssinaturaAtual(perfume);
        modal.style.display = 'none';
        titulo.textContent = 'Adicionar ao Top 5';
      });
      lista.appendChild(card);
    });
  }
  
  // ✅ Renderiza perfumes inicialmente
  renderizarPerfumesAssinatura();
  
  // ✅ Adiciona evento de pesquisa com debounce
  if (inputPesquisa) {
    let timeoutPesquisa;
    
    // Remove event listeners antigos
    const novoPesquisa = inputPesquisa.cloneNode(true);
    inputPesquisa.parentNode.replaceChild(novoPesquisa, inputPesquisa);
    
    novoPesquisa.addEventListener('input', (e) => {
      clearTimeout(timeoutPesquisa);
      timeoutPesquisa = setTimeout(() => {
        renderizarPerfumesAssinatura(e.target.value.trim());
      }, 300);
    });
  }
  
  modal.style.display = 'flex';
}

/**
 * Abre modal para adicionar perfume à seção
 */
function abrirModalAdicionar(tipo) {
  const modal = document.getElementById('modal-adicionar');
  const lista = document.getElementById('lista-perfumes-modal');
  
  lista.innerHTML = '';
  
  if (perfumesData.length === 0) {
    lista.innerHTML = '<p style="text-align:center;color:#666;">Você ainda não cadastrou nenhum perfume</p>';
  } else {
    perfumesData.forEach(perfume => {
      const card = criarCardModal(perfume, () => {
        modal.style.display = 'none';
      });
      lista.appendChild(card);
    });
  }
  
  modal.style.display = 'flex';
}

// Abre modal Top 5
async function abrirModalTop5() {
  const modal = document.getElementById('modal-top5');
  const lista = document.getElementById('lista-perfumes-top5');
  const titulo = document.getElementById('titulo-modal-top5');
  const inputPesquisa = document.getElementById('pesquisa-top5');
  
  titulo.textContent = 'Adicionar ao Top 5';
  lista.innerHTML = '';
  
  if (inputPesquisa) {
    inputPesquisa.value = '';
  }

  // Aviso — só perfumes avaliados
  let avisoEl = document.getElementById('aviso-top5-avaliados');
  if (!avisoEl) {
    avisoEl = document.createElement('p');
    avisoEl.id = 'aviso-top5-avaliados';
    avisoEl.style.cssText = 'font-size:12px;color:#999;text-align:center;margin:0 0 12px;font-style:italic;';
    avisoEl.textContent = 'Apenas perfumes que você já avaliou podem entrar no Top 5.';
    lista.before(avisoEl);
  }
  
  const top5Atual = preferenciasUsuario?.top5 || [];

  // Só perfumes com avaliação
  const perfumesAvaliados = perfumesData.filter(p => p.avaliacoes?.media > 0);
  
  // ✅ Função para renderizar perfumes (com filtro opcional)
  function renderizarPerfumesTop5(termoPesquisa = '') {
    lista.innerHTML = '';
    
    if (perfumesAvaliados.length === 0) {
      lista.innerHTML = '<p style="text-align:center;color:#666;">Você ainda não avaliou nenhum perfume</p>';
      return;
    }
    
    // Filtra perfumes se houver termo de pesquisa
    let perfumesFiltrados = perfumesAvaliados;
    if (termoPesquisa) {
      const termo = termoPesquisa.toLowerCase();
      perfumesFiltrados = perfumesAvaliados.filter(p => 
        p.nome.toLowerCase().includes(termo) ||
        p.marca.toLowerCase().includes(termo)
      );
    }
    
    if (perfumesFiltrados.length === 0) {
      lista.innerHTML = `
        <div class="sem-resultados-modal">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <p>Nenhum perfume encontrado para "<strong>${termoPesquisa}</strong>"</p>
        </div>
      `;
      return;
    }
    
    perfumesFiltrados.forEach(perfume => {
      const jaEstaNoTop5 = top5Atual.includes(perfume.id);
      
      const card = criarCardModal(perfume, async () => {
        if (top5Atual.length >= 5) {
          alert('Você já tem 5 perfumes no Top 5!');
          return;
        }
        
        toggleLoading(true);
        
        try {
          const novoTop5 = [...top5Atual, perfume.id];
          
          const dadosParaSalvar = preferenciasUsuario?.assinaturaAtual 
            ? { 
                top5: novoTop5,
                assinaturaAtual: preferenciasUsuario.assinaturaAtual
              }
            : { 
                top5: novoTop5 
              };
          
          await salvarPreferenciasUsuario(usuarioAtual.uid, dadosParaSalvar);
          
          if (!preferenciasUsuario) {
            preferenciasUsuario = { top5: [] };
          }
          preferenciasUsuario.top5 = novoTop5;
          
          renderizarTop5(novoTop5);
          modal.style.display = 'none';
          
          console.log('✅ Perfume adicionado ao Top 5!');
        } catch (error) {
          console.error('❌ Erro ao salvar Top 5:', error);
          alert('❌ ' + error.message);
        } finally {
          toggleLoading(false);
        }
      }, jaEstaNoTop5);
      
      lista.appendChild(card);
    });
  }
  
  // ✅ Renderiza perfumes inicialmente
  renderizarPerfumesTop5();
  
  // ✅ Adiciona evento de pesquisa com debounce
  if (inputPesquisa) {
    let timeoutPesquisa;
    
    // Remove event listeners antigos
    const novoPesquisa = inputPesquisa.cloneNode(true);
    inputPesquisa.parentNode.replaceChild(novoPesquisa, inputPesquisa);
    
    novoPesquisa.addEventListener('input', (e) => {
      clearTimeout(timeoutPesquisa);
      timeoutPesquisa = setTimeout(() => {
        renderizarPerfumesTop5(e.target.value.trim());
      }, 300);
    });
  }
  
  modal.style.display = 'flex';
}

/**
 * Cria card para modal
 */
function criarCardModal(perfume, onClick, disabled = false) {
  const card = document.createElement('div');
  card.className = 'perfume-modal-card';
  
  if (disabled) {
    card.style.opacity = '0.5';
    card.style.cursor = 'not-allowed';
    card.title = 'Já está no Top 5';
  } else {
    card.onclick = onClick;
  }
  
  card.innerHTML = `
    <div class="perfume-modal-img">
      ${perfume.fotoURL ? `<img src="${perfume.fotoURL}" alt="${perfume.nome}">` : `<div style="background:#d9d9d9;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#666;padding:5px;text-align:center;">${perfume.nome}</div>`}
    </div>
    <div class="perfume-modal-nome">${perfume.nome}</div>
  `;
  
  return card;
}

// Event listeners para modais
document.querySelector('.close')?.addEventListener('click', () => {
  document.getElementById('modal-adicionar').style.display = 'none';
});

document.querySelector('.close-top5')?.addEventListener('click', () => {
  const modal = document.getElementById('modal-top5');
  modal.style.display = 'none';
  modal.querySelector('h3').textContent = 'Adicionar ao Top 5';
});

window.onclick = (event) => {
  const modalAdicionar = document.getElementById('modal-adicionar');
  const modalTop5 = document.getElementById('modal-top5');
  
  if (event.target === modalAdicionar) {
    modalAdicionar.style.display = 'none';
  }
  if (event.target === modalTop5) {
    modalTop5.style.display = 'none';
    modalTop5.querySelector('h3').textContent = 'Adicionar ao Top 5';
  }
};

// Botões de navegação
document.getElementById('btn-cadastrar')?.addEventListener('click', () => {
  window.location.href = '../adicionar-perfume/form-add-perf.html';
});

document.getElementById('btn-cadastrar-novo')?.addEventListener('click', () => {
  window.location.href = '../adicionar-perfume/form-add-perf.html';
});

document.getElementById('btn-editar-perfil')?.addEventListener('click', () => {
  window.location.href = '../criar-conta/criar-conta.html?editar=true';
});

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

/**
 * ✅ Sistema de Drag & Drop entre seções
 */
function inicializarDragDrop() {
    const secoes = ['tenho', 'ja-tive', 'quero-ter'];
    
    secoes.forEach(secaoId => {
        const lista = document.getElementById(secaoId);
        if (!lista) return;
        
        // Torna a lista droppable
        lista.addEventListener('dragover', (e) => {
            e.preventDefault();
            lista.classList.add('drag-over');
        });
        
        lista.addEventListener('dragleave', () => {
            lista.classList.remove('drag-over');
        });
        
        lista.addEventListener('drop', async (e) => {
            e.preventDefault();
            lista.classList.remove('drag-over');
            
            const perfumeId = e.dataTransfer.getData('perfume-id');
            const statusOrigem = e.dataTransfer.getData('status-origem');
            const novoStatus = secaoId === 'tenho' ? 'tenho' :
                              secaoId === 'ja-tive' ? 'ja-tive' :
                              secaoId === 'quero-ter' ? 'quero-ter' : '';
            
            if (!perfumeId || statusOrigem === novoStatus) return;
            
            // Busca perfume
            const perfume = perfumesData.find(p => p.id === perfumeId);
            if (!perfume) return;
            
            // Confirma mudança
            const textoNovo = novoStatus === 'tenho' ? 'Tenho' :
                             novoStatus === 'ja-tive' ? 'Já tive' : 'Quero ter';
            
            if (!confirm(`Mover "${perfume.nome}" para "${textoNovo}"?`)) {
                return;
            }
            
            // Salva mudança
            try {
                toggleLoading(true);
                
                const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                const { db } = await import('../adicionar-perfume/firebase-config.js');
                
                const perfumeRef = doc(db, "perfumes", perfumeId);
                await updateDoc(perfumeRef, {
                    status: novoStatus
                });
                
                perfume.status = novoStatus;
                
                console.log('✅ Status atualizado via drag & drop!');
                
                // Atualiza interface
                renderizarPerfumes();
                
            } catch (error) {
                console.error('❌ Erro ao atualizar:', error);
                alert('❌ Erro ao mover perfume: ' + error.message);
            } finally {
                toggleLoading(false);
            }
        });
    });
}

// Chama após carregar perfumes
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarDragDrop);
} else {
    setTimeout(inicializarDragDrop, 1000);
}

/**
 * ✅ SISTEMA DE ESTATÍSTICAS
 */

// Abre modal de estatísticas
document.getElementById('btn-estatisticas')?.addEventListener('click', async () => {
  const modal = document.getElementById('modal-estatisticas');
  const conteudo = document.getElementById('conteudo-estatisticas');
  
  toggleLoading(true);
  
  try {
    const stats = await calcularEstatisticas();
    conteudo.innerHTML = renderizarEstatisticas(stats);
    modal.style.display = 'flex';
    
    // Adiciona event listeners aos botões de toggle e popups de acordes
    setTimeout(() => {
      const btnQtd = document.getElementById('btn-marcas-qtd');
      const btnAval = document.getElementById('btn-marcas-aval');
      if (btnQtd) btnQtd.addEventListener('click', () => toggleMarcas('quantidade'));
      if (btnAval) btnAval.addEventListener('click', () => toggleMarcas('avaliacao'));

      // Popups dos acordes favoritos
      document.querySelectorAll('.acorde-clicavel').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = el.dataset.acordeIdx;
          const popup = document.getElementById(`acorde-popup-${idx}`);
          // Fecha todos os outros
          document.querySelectorAll('.acorde-popup').forEach(p => {
            if (p !== popup) p.style.display = 'none';
          });
          popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
        });
      });

      // Fecha popup ao clicar fora
      document.getElementById('conteudo-estatisticas').addEventListener('click', () => {
        document.querySelectorAll('.acorde-popup').forEach(p => p.style.display = 'none');
      });
    }, 100);
    
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
    alert('Erro ao carregar estatísticas');
  } finally {
    toggleLoading(false);
  }
});

// Fecha modal de estatísticas
document.querySelector('.close-estatisticas')?.addEventListener('click', () => {
  document.getElementById('modal-estatisticas').style.display = 'none';
});

// ✅ NOVO: Fecha modal ao clicar fora
window.addEventListener('click', (event) => {
  const modal = document.getElementById('modal-estatisticas');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

/**
 * Calcula estatísticas do usuário
 */
async function calcularEstatisticas() {
  // Perfumes com avaliação (que têm média calculada)
  const perfumesAvaliados = perfumesData.filter(p => p.avaliacoes && p.avaliacoes.media && p.avaliacoes.media > 0);
  
  // Média de avaliações
  const mediaAvaliacoes = perfumesAvaliados.length > 0
    ? perfumesAvaliados.reduce((sum, p) => sum + p.avaliacoes.media, 0) / perfumesAvaliados.length
    : 0;
  
  // Marca mais avaliada
  const marcas = {};
  perfumesData.forEach(p => {
    if (!marcas[p.marca]) {
      marcas[p.marca] = { count: 0, somaAvaliacoes: 0, avaliacoes: 0 };
    }
    marcas[p.marca].count++;
    if (p.avaliacoes && p.avaliacoes.media) {
      marcas[p.marca].somaAvaliacoes += p.avaliacoes.media;
      marcas[p.marca].avaliacoes++;
    }
  });
  
  const marcaMaisAvaliada = Object.entries(marcas)
    .map(([nome, data]) => ({
      nome,
      count: data.count,
      media: data.avaliacoes > 0 ? data.somaAvaliacoes / data.avaliacoes : 0
    }))
    .sort((a, b) => b.count - a.count)[0];

    // ✅ NOVO: Top 3 marcas com mais perfumes possuídos (Tenho + Já tive)
// ✅ Top 3 marcas - Por QUANTIDADE possuída (Tenho + Já tive)
const top3MarcasQuantidade = Object.entries(marcas)
  .map(([nome, data]) => {
    const perfumesDaMarca = perfumesData.filter(p => p.marca === nome);
    const tenhoJaTive = perfumesDaMarca.filter(p => p.status === 'tenho' || p.status === 'ja-tive').length;
    const perfumesAvaliadosMarca = perfumesDaMarca.filter(p => p.avaliacoes && p.avaliacoes.media);
    const melhorPerfume = perfumesAvaliadosMarca.length > 0
      ? perfumesAvaliadosMarca.sort((a, b) => b.avaliacoes.media - a.avaliacoes.media)[0]
      : null;
    
    return {
      nome,
      tenhoJaTive,
      qtdAvaliados: perfumesAvaliadosMarca.length,
      media: perfumesAvaliadosMarca.length > 0 
        ? perfumesAvaliadosMarca.reduce((sum, p) => sum + p.avaliacoes.media, 0) / perfumesAvaliadosMarca.length 
        : 0,
      melhorPerfume: melhorPerfume ? {
        nome: melhorPerfume.nome,
        nota: melhorPerfume.avaliacoes.media
      } : null
    };
  })
  .filter(m => m.qtdAvaliados > 0)
  .sort((a, b) => b.qtdAvaliados - a.qtdAvaliados)
  .slice(0, 3);

// ✅ Top 3 marcas - Por MELHOR AVALIAÇÃO (mínimo 2 avaliados)
const top3MarcasAvaliacao = Object.entries(marcas)
  .map(([nome, data]) => {
    const perfumesDaMarca = perfumesData.filter(p => p.marca === nome);
    const tenhoJaTive = perfumesDaMarca.filter(p => p.status === 'tenho' || p.status === 'ja-tive').length;
    const perfumesAvaliadosMarca = perfumesDaMarca.filter(p => p.avaliacoes && p.avaliacoes.media);
    const melhorPerfume = perfumesAvaliadosMarca.length > 0
      ? perfumesAvaliadosMarca.sort((a, b) => b.avaliacoes.media - a.avaliacoes.media)[0]
      : null;
    
    return {
      nome,
      tenhoJaTive,
      qtdAvaliados: perfumesAvaliadosMarca.length,
      media: perfumesAvaliadosMarca.length > 0 
        ? perfumesAvaliadosMarca.reduce((sum, p) => sum + p.avaliacoes.media, 0) / perfumesAvaliadosMarca.length 
        : 0,
      melhorPerfume: melhorPerfume ? {
        nome: melhorPerfume.nome,
        nota: melhorPerfume.avaliacoes.media
      } : null
    };
  })
  .filter(m => m.qtdAvaliados >= 2) // ✅ Mínimo 2 perfumes avaliados
  .sort((a, b) => b.media - a.media) // ✅ Ordena por média de avaliação
  .slice(0, 3);
  
  // Acordes favoritos: considera só os 2 primeiros acordes de cada perfume avaliado,
  // filtra acordes que aparecem menos de 3 vezes, e rankeia por média de avaliação.
  const acordesComAvaliacoes = {};

  perfumesAvaliados.forEach(p => {
    if (p.acordes && Array.isArray(p.acordes)) {
      p.acordes.slice(0, 2).forEach(acorde => {
        if (!acordesComAvaliacoes[acorde]) {
          acordesComAvaliacoes[acorde] = { somaAvaliacoes: 0, count: 0, perfumes: [] };
        }
        acordesComAvaliacoes[acorde].somaAvaliacoes += p.avaliacoes.media;
        acordesComAvaliacoes[acorde].count++;
        acordesComAvaliacoes[acorde].perfumes.push({ id: p.id, nome: p.nome, marca: p.marca, nota: p.avaliacoes.media });
      });
    }
  });

  const acordesFavoritos = Object.entries(acordesComAvaliacoes)
    .filter(([, data]) => data.count >= 3)
    .map(([nome, data]) => ({
      nome,
      count: data.count,
      mediaAvaliacao: data.somaAvaliacoes / data.count,
      perfumes: data.perfumes.sort((a, b) => b.nota - a.nota)
    }))
    .sort((a, b) => b.mediaAvaliacao - a.mediaAvaliacao)
    .slice(0, 5);
  
  // Perfume mais caro que tenho
  const perfumesTenho = perfumesData.filter(p => p.status === 'tenho' && p.preco);
  const perfumeMaisCaroTenho = perfumesTenho.length > 0
    ? perfumesTenho.sort((a, b) => b.preco - a.preco)[0]
    : null;
  
  // Perfume mais caro que quero
  const perfumesQuero = perfumesData.filter(p => p.status === 'quero-ter' && p.preco);
  const perfumeMaisCaroQuero = perfumesQuero.length > 0
    ? perfumesQuero.sort((a, b) => b.preco - a.preco)[0]
    : null;
  
  // Distribuição por status
  const statusDistribuicao = {
    tenho: perfumesData.filter(p => p.status === 'tenho').length,
    jaTive: perfumesData.filter(p => p.status === 'ja-tive').length,
    queroTer: perfumesData.filter(p => p.status === 'quero-ter').length
  };

  // ✅ NOVO: Total de perfumes possuídos (apenas "Tenho")
  const totalPossuidos = statusDistribuicao.tenho;
  
  // Melhores avaliações - TOP 6
  const melhoresAvaliacoes = perfumesAvaliados
  .sort((a, b) => b.avaliacoes.media - a.avaliacoes.media)
  .slice(0, 6);
  
  // Mês com mais cadastros
  const meses = {};
  perfumesData.forEach(p => {
    if (p.dataCriacao) {
      const data = p.dataCriacao.toDate ? p.dataCriacao.toDate() : new Date(p.dataCriacao);
      const chave = `${data.getFullYear()}-${data.getMonth()}`;
      const mesNome = data.toLocaleDateString('pt-BR', { month: 'long' });
      const ano = data.getFullYear();
      
      if (!meses[chave]) {
        meses[chave] = { mes: mesNome, ano, count: 0 };
      }
      meses[chave].count++;
    }
  });
  
  const mesComMaisCadastros = Object.values(meses)
    .sort((a, b) => b.count - a.count)[0] || { mes: '-', ano: '', count: 0 };
  
  return {
    mediaAvaliacoes,
    totalPerfumes: perfumesData.length,
    totalAvaliacoes: perfumesAvaliados.length,
    totalPossuidos,
    marcaMaisAvaliada,
    top3MarcasQuantidade,  // ✅ Por quantidade
    top3MarcasAvaliacao,   // ✅ Por avaliação
    acordesFavoritos,
    perfumeMaisCaroTenho,
    perfumeMaisCaroQuero,
    statusDistribuicao,
    melhoresAvaliacoes,
    mesComMaisCadastros
  };
}

/**
 * Renderiza estatísticas em HTML
 */
function renderizarEstatisticas(stats) {
  return `
    <!-- Cards principais -->
    <div class="stats-grid">
      <div class="stat-card stat-highlight">
        <div class="stat-card-header">
          <svg class="stat-card-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span class="stat-card-value">${stats.mediaAvaliacoes.toFixed(1)}</span>
        </div>
        <div class="stat-card-title">Média de Avaliações</div>
        <div class="stat-card-subtitle">${stats.totalAvaliacoes} avaliados</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-card-header">
          <svg class="stat-card-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="stat-card-value">${stats.totalPossuidos}</span>
        </div>
        <div class="stat-card-title">Total de Perfumes Possuídos</div>
        <div class="stat-card-subtitle">que você tem</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-card-header">
          <svg class="stat-card-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span class="stat-card-value">${stats.totalAvaliacoes}</span>
        </div>
        <div class="stat-card-title">Perfumes Avaliados</div>
        <div class="stat-card-subtitle">com notas</div>
      </div>
    </div>
    
    <!-- Grid: Acordes Favoritos + Melhores Avaliações (2 colunas) -->
    <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 20px; margin-bottom: 20px;">
      
      <!-- Acordes favoritos -->
      ${stats.acordesFavoritos.length > 0 ? `
        <div class="stats-section">
          <div class="stats-section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Acordes Favoritos
          </div>
          <div style="font-size: 11px; color: #999; margin-bottom: 12px;">
            Baseado nas suas avaliações
          </div>
          ${stats.acordesFavoritos.map((acorde, idx) => `
            <div class="progress-item" style="position: relative;">
              <div class="progress-label">
                <span class="progress-label-name acorde-clicavel" 
                      data-acorde-idx="${idx}"
                      style="cursor: pointer;">
                  ${acorde.nome}
                </span>
                <span class="progress-label-value">
                  ${acorde.mediaAvaliacao.toFixed(1)} ⭐ • ${acorde.count} ${acorde.count === 1 ? 'perfume' : 'perfumes'}
                </span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${(acorde.mediaAvaliacao / 5) * 100}%; background: ${coresAcordes[acorde.nome] || '#C06060'};"></div>
              </div>
              <!-- Popup de perfumes do acorde -->
              <div class="acorde-popup" id="acorde-popup-${idx}" style="display:none;">
                <div class="acorde-popup-titulo">${acorde.nome}</div>
                ${acorde.perfumes.map(p => `
                  <a href="../perfumes/perfume.html?id=${p.id}" target="_blank" class="acorde-popup-item">
                    <span class="acorde-popup-nome">${p.nome} <span style="color:#999; font-weight:400;">${p.marca}</span></span>
                    <span class="acorde-popup-nota">${p.nota.toFixed(1)} ⭐</span>
                  </a>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <!-- Melhores avaliações - TOP 6 em 2 colunas -->
      ${stats.melhoresAvaliacoes.length > 0 ? `
        <div class="stats-section">
          <div class="stats-section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            Melhores Avaliações
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            ${stats.melhoresAvaliacoes.map((perfume, idx) => `
              <a href="../perfumes/perfume.html?id=${perfume.id}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; display: block;">
                <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; display: flex; align-items: center; gap: 10px; transition: all 0.2s; cursor: pointer;">
                  <span class="top-list-item-rank">#${idx + 1}</span>
                  <div style="flex: 1; min-width: 0;">
                    <div class="top-list-item-name">${perfume.nome}</div>
                    <div class="top-list-item-subtitle">${perfume.marca}</div>
                  </div>
                  <span class="top-list-item-value">${perfume.avaliacoes.media.toFixed(1)} ⭐</span>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
    </div>
    
    <!-- ✅ Top 3 Marcas com Toggle -->
    ${(stats.top3MarcasQuantidade.length > 0 || stats.top3MarcasAvaliacao.length > 0) ? `
      <div class="stats-section stat-highlight">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div class="stats-section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="7"></circle>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
            </svg>
            Top 3 Marcas
          </div>
          
          <!-- Toggle de ordenação -->
          <div style="display: flex; gap: 10px;">
            <button id="btn-marcas-qtd" class="btn-toggle-marcas ativo" style="padding: 8px 16px; background: #C06060; color: #fff; border: 2px solid #C06060; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              Por Quantidade
            </button>
            <button id="btn-marcas-aval" class="btn-toggle-marcas" style="padding: 8px 16px; background: transparent; color: #C06060; border: 2px solid #C06060; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              Por Avaliação
            </button>
          </div>
        </div>
        
        <!-- Marcas por Quantidade -->
        <div id="marcas-quantidade" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          ${stats.top3MarcasQuantidade.map((marca, idx) => `
            <div style="background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%); padding: 20px; border-radius: 12px; border: 2px solid ${idx === 0 ? '#C06060' : '#e9ecef'};">
              <div style="text-align: center; margin-bottom: 12px;">
                <div style="font-size: 32px; margin-bottom: 8px;">
                  ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                </div>
                <a href="../marca/marca.html?nome=${encodeURIComponent(marca.nome)}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit;">
                  <h3 style="font-size: 20px; font-weight: 700; color: ${idx === 0 ? '#C06060' : '#000'}; margin: 0; transition: all 0.2s; cursor: pointer;">
                    ${marca.nome}
                  </h3>
                </a>
              </div>
              <div style="text-align: center; font-size: 18px; font-weight: 600; color: #666; margin-bottom: 12px;">
                ${marca.qtdAvaliados} ${marca.qtdAvaliados === 1 ? 'perfume avaliado' : 'perfumes avaliados'}
              </div>
              <div style="font-size: 14px; color: #666; text-align: center; margin-bottom: 8px;">
                <strong>Média:</strong> ${marca.media > 0 ? marca.media.toFixed(1) + ' ⭐' : 'Sem avaliações'}
              </div>
              ${marca.melhorPerfume ? `
                <div style="margin-top: 12px; padding: 12px; background: rgba(192, 96, 96, 0.05); border-radius: 8px; text-align: center;">
                  <strong style="color: #C06060; font-size: 12px;">Mais bem avaliado:</strong>
                  <div style="margin-top: 6px; font-size: 13px; font-weight: 600;">
                    ${marca.melhorPerfume.nome}
                  </div>
                  <div style="font-size: 14px; color: #C06060; font-weight: 700; margin-top: 4px;">
                    ${marca.melhorPerfume.nota.toFixed(1)} ⭐
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        
        <!-- Marcas por Avaliação -->
        <div id="marcas-avaliacao" style="display: none; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          ${stats.top3MarcasAvaliacao.map((marca, idx) => `
            <div style="background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%); padding: 20px; border-radius: 12px; border: 2px solid ${idx === 0 ? '#C06060' : '#e9ecef'};">
              <div style="text-align: center; margin-bottom: 12px;">
                <div style="font-size: 32px; margin-bottom: 8px;">
                  ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                </div>
                <a href="../marca/marca.html?nome=${encodeURIComponent(marca.nome)}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit;">
                  <h3 style="font-size: 20px; font-weight: 700; color: ${idx === 0 ? '#C06060' : '#000'}; margin: 0; transition: all 0.2s; cursor: pointer;">
                    ${marca.nome}
                  </h3>
                </a>
              </div>
              <div style="text-align: center; font-size: 18px; font-weight: 600; color: #666; margin-bottom: 8px;">
                ${marca.media.toFixed(1)} ⭐
              </div>
              <div style="font-size: 14px; color: #666; text-align: center; margin-bottom: 8px;">
                ${marca.qtdAvaliados} ${marca.qtdAvaliados === 1 ? 'perfume avaliado' : 'perfumes avaliados'}
              </div>
              ${marca.melhorPerfume ? `
                <div style="margin-top: 12px; padding: 12px; background: rgba(192, 96, 96, 0.05); border-radius: 8px; text-align: center;">
                  <strong style="color: #C06060; font-size: 12px;">Mais bem avaliado:</strong>
                  <div style="margin-top: 6px; font-size: 13px; font-weight: 600;">
                    ${marca.melhorPerfume.nome}
                  </div>
                  <div style="font-size: 14px; color: #C06060; font-weight: 700; margin-top: 4px;">
                    ${marca.melhorPerfume.nota.toFixed(1)} ⭐
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

/**
 * ✅ Toggle entre Top 3 Marcas por Quantidade ou Avaliação
 */
function toggleMarcas(tipo) {
  const btnQtd = document.getElementById('btn-marcas-qtd');
  const btnAval = document.getElementById('btn-marcas-aval');
  const divQtd = document.getElementById('marcas-quantidade');
  const divAval = document.getElementById('marcas-avaliacao');
  
  if (!btnQtd || !btnAval || !divQtd || !divAval) return;
  
  if (tipo === 'quantidade') {
    btnQtd.classList.add('ativo');
    btnAval.classList.remove('ativo');
    btnQtd.style.background = '#C06060';
    btnQtd.style.color = '#fff';
    btnAval.style.background = 'transparent';
    btnAval.style.color = '#C06060';
    divQtd.style.display = 'grid';
    divAval.style.display = 'none';
  } else {
    btnAval.classList.add('ativo');
    btnQtd.classList.remove('ativo');
    btnAval.style.background = '#C06060';
    btnAval.style.color = '#fff';
    btnQtd.style.background = 'transparent';
    btnQtd.style.color = '#C06060';
    divQtd.style.display = 'none';
    divAval.style.display = 'grid';
  }
}

// Torna a função disponível globalmente
window.toggleMarcas = toggleMarcas;
// ===== EXPORTAR EXCEL =====
const COLUNAS_EXPORTAR = [
  { id: 'nome',        label: 'Nome',              padrao: false },
  { id: 'marca',       label: 'Marca',             padrao: false },
  { id: 'linha',       label: 'Linha',             padrao: false },
  { id: 'status',      label: 'Status',            padrao: false },
  { id: 'media',       label: 'Nota média',        padrao: false },
  { id: 'cheiro',      label: 'Cheiro',            padrao: false },
  { id: 'projecao',    label: 'Projeção',          padrao: false },
  { id: 'fixacao',     label: 'Fixação',           padrao: false },
  { id: 'versatilidade', label: 'Versatilidade',  padrao: false },
  { id: 'acordes',     label: 'Acordes',           padrao: false },
  { id: 'notasTopo',   label: 'Notas de topo',     padrao: false },
  { id: 'notasCoracao',label: 'Notas de coração',  padrao: false },
  { id: 'notasFundo',  label: 'Notas de fundo',    padrao: false },
  { id: 'perfumista',  label: 'Perfumista',        padrao: false },
  { id: 'genero',      label: 'Gênero',            padrao: false },
  { id: 'clima',       label: 'Clima',             padrao: false },
  { id: 'ambiente',    label: 'Ambiente',          padrao: false },
  { id: 'hora',        label: 'Hora do dia',       padrao: false },
  { id: 'contratipo',  label: 'É contratipo?',     padrao: false },
  { id: 'linkCompra',  label: 'Link de compra',    padrao: false },
  { id: 'review',      label: 'Review',            padrao: false },
];

const modalExportar = document.getElementById('modal-exportar');

function abrirModalExportar(e) {
  e.preventDefault();
  document.getElementById('menu-lateral')?.classList.remove('aberto');
  document.getElementById('menu-overlay')?.classList.remove('ativo');
  // Reset: volta pra etapa 1
  irParaEtapa1();
  modalExportar.style.display = 'flex';
}

function fecharModalExportar() {
  modalExportar.style.display = 'none';
}

function irParaEtapa1() {
  document.getElementById('exportar-etapa-1').style.display = 'block';
  document.getElementById('exportar-etapa-2').style.display = 'none';
  document.getElementById('btn-confirmar-exportar').style.display = 'none';
  // Limpa seleção de filtro
  document.querySelectorAll('input[name="filtro-exportar"]').forEach(r => r.checked = false);
  document.querySelectorAll('.exportar-opcao-box').forEach(b => b.parentElement.classList.remove('selecionada'));
}

function irParaEtapa2() {
  document.getElementById('exportar-etapa-1').style.display = 'none';
  document.getElementById('exportar-etapa-2').style.display = 'block';
  document.getElementById('btn-confirmar-exportar').style.display = 'flex';

  const filtroAtual = document.querySelector('input[name="filtro-exportar"]:checked')?.value || 'todos';

  // Gera checkboxes
  const grid = document.getElementById('exportar-colunas-grid');
  grid.innerHTML = '';
  COLUNAS_EXPORTAR.forEach(col => {
    // Oculta "Status" quando filtro não é "todos" (seria redundante)
    if (col.id === 'status' && filtroAtual !== 'todos') return;

    const item = document.createElement('label');
    item.className = 'exportar-coluna-item';
    item.innerHTML = `
      <input type="checkbox" value="${col.id}">
      <span class="exportar-coluna-label">${col.label}</span>
    `;
    const cb = item.querySelector('input');
    cb.addEventListener('change', () => item.classList.toggle('marcado', cb.checked));
    grid.appendChild(item);
  });
}

// Event listeners
document.getElementById('menu-exportar-excel')?.addEventListener('click', abrirModalExportar);
document.getElementById('btn-fechar-exportar')?.addEventListener('click', fecharModalExportar);
document.getElementById('btn-cancelar-exportar')?.addEventListener('click', fecharModalExportar);
document.getElementById('btn-exportar-voltar')?.addEventListener('click', irParaEtapa1);

// Clicar num filtro vai direto pra etapa 2
document.querySelectorAll('input[name="filtro-exportar"]').forEach(radio => {
  radio.addEventListener('change', () => irParaEtapa2());
});

// Marcar/desmarcar todos
document.getElementById('btn-marcar-todos')?.addEventListener('click', () => {
  document.querySelectorAll('#exportar-colunas-grid input[type="checkbox"]').forEach(cb => {
    cb.checked = true;
    cb.closest('.exportar-coluna-item').classList.add('marcado');
  });
});
document.getElementById('btn-desmarcar-todos')?.addEventListener('click', () => {
  document.querySelectorAll('#exportar-colunas-grid input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
    cb.closest('.exportar-coluna-item').classList.remove('marcado');
  });
});

// Fecha ao clicar no overlay
modalExportar?.addEventListener('click', (e) => {
  if (e.target === modalExportar) fecharModalExportar();
});

document.getElementById('btn-confirmar-exportar')?.addEventListener('click', () => {
  const filtro = document.querySelector('input[name="filtro-exportar"]:checked')?.value || 'todos';
  const colunasSelecionadas = Array.from(document.querySelectorAll('#exportar-colunas-grid input:checked')).map(cb => cb.value);

  if (colunasSelecionadas.length === 0) {
    alert('Selecione pelo menos uma coluna para exportar.');
    return;
  }

  // Filtra perfumes
  let perfumes = perfumesData;
  if (filtro !== 'todos') {
    perfumes = perfumesData.filter(p => p.status === filtro);
  }

  if (perfumes.length === 0) {
    alert('Nenhum perfume encontrado para o filtro selecionado.');
    return;
  }

  // Mapa de extração de cada campo
  const STATUS_LABELS = { 'tenho': 'Tenho', 'ja-tive': 'Já tive', 'quero-ter': 'Quero ter', '': '-' };
  const GENERO_LABELS = { 'masculino': 'Masculino', 'um-pouco-masculino': 'Um pouco masculino', 'compartilhavel': 'Compartilhável', 'um-pouco-feminino': 'Um pouco feminino', 'feminino': 'Feminino' };

  const HORA_LABELS   = { '0': 'Noturno', '25': 'Um pouco mais noturno', '50': 'Versátil', '75': 'Um pouco mais diurno', '100': 'Diurno' };
  const CLIMA_LABELS  = { '0': 'Frio', '25': 'Um pouco mais frio', '50': 'Versátil', '75': 'Um pouco mais quente', '100': 'Calor' };
  const AMBIENTE_LABELS = { '0': 'Informal', '25': 'Um pouco mais informal', '50': 'Versátil', '75': 'Um pouco mais formal', '100': 'Formal' };

  const extratores = {
    nome:          p => p.nome || '',
    marca:         p => p.marca || '',
    linha:         p => p.linha || '',
    status:        p => STATUS_LABELS[p.status] || p.status || '',
    media:         p => p.avaliacoes?.media ?? '',
    cheiro:        p => p.avaliacoes?.cheiro ?? '',
    projecao:      p => p.avaliacoes?.projecao ?? '',
    fixacao:       p => p.avaliacoes?.fixacao ?? '',
    versatilidade: p => p.avaliacoes?.versatilidade ?? '',
    acordes:       p => (p.acordes || []).join(', '),
    notasTopo:     p => (p.notas?.topo || []).join(', '),
    notasCoracao:  p => (p.notas?.coracao || []).join(', '),
    notasFundo:    p => (p.notas?.fundo || []).join(', '),
    perfumista:    p => p.perfumista || '',
    genero:        p => GENERO_LABELS[p.caracteristicas?.genero] || p.caracteristicas?.genero || '',
    clima:         p => CLIMA_LABELS[String(p.caracteristicas?.clima)] || '',
    ambiente:      p => AMBIENTE_LABELS[String(p.caracteristicas?.ambiente)] || '',
    hora:          p => HORA_LABELS[String(p.caracteristicas?.hora)] || '',
    contratipo:    p => {
      if (!p.contratipo?.eh) return 'Não';
      const orig = perfumesData.find(x => x.id === p.contratipo.perfumeOriginal);
      return orig ? `Sim (${orig.nome} de ${orig.marca})` : 'Sim';
    },
    linkCompra:    p => p.linkCompra || '',
    review:        p => p.review?.texto || '',
  };

  const colunasInfo = COLUNAS_EXPORTAR.filter(col => colunasSelecionadas.includes(col.id));
  const cabecalhos = colunasInfo.map(col => col.label);

  // Monta linhas
  const linhas = perfumes.map(p => colunasInfo.map(col => extratores[col.id]?.(p) ?? ''));

  // Carrega SheetJS dinamicamente e exporta
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  script.onload = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [cabecalhos, ...linhas];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Hyperlinks reais para a coluna linkCompra
    const linkCompraIdx = colunasInfo.findIndex(col => col.id === 'linkCompra');
    if (linkCompraIdx >= 0) {
      linhas.forEach((linha, rowIdx) => {
        const url = linha[linkCompraIdx];
        if (url && url.startsWith('http')) {
          const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: linkCompraIdx });
          if (ws[cellRef]) {
            ws[cellRef].l = { Target: url, Tooltip: url };
          }
        }
      });
    }

    // Largura das colunas
    ws['!cols'] = cabecalhos.map((h, i) => {
      const maxLen = Math.max(h.length, ...linhas.map(r => String(r[i] || '').length));
      return { wch: Math.min(Math.max(maxLen + 2, 12), 50) };
    });

    const filtroLabel = { todos: 'Todos', tenho: 'Tenho', 'ja-tive': 'Ja tive', 'quero-ter': 'Quero ter' };
    XLSX.utils.book_append_sheet(wb, ws, filtroLabel[filtro] || 'Perfumes');
    XLSX.writeFile(wb, `perfumes_${filtro}_${new Date().toISOString().slice(0,10)}.xlsx`);
    fecharModalExportar();
  };
  script.onerror = () => alert('Erro ao carregar biblioteca de exportação. Verifique sua conexão.');
  document.head.appendChild(script);
});


// ===== HISTÓRICO DE ASSINATURA =====
function abrirHistoricoAssinatura() {
  const modal = document.getElementById('modal-historico-assinatura');
  const lista = document.getElementById('historico-lista');
  const historico = (preferenciasUsuario?.historicoAssinatura || []).slice().reverse();

  if (historico.length === 0) {
    lista.innerHTML = '<p class="historico-vazio">Nenhuma assinatura registrada ainda.</p>';
  } else {
    lista.innerHTML = historico.map((h, idx) => {
      const isAtual = idx === 0 && !h.fim;
      const inicio = formatarDataHistorico(h.inicio);
      const fim = h.fim ? formatarDataHistorico(h.fim) : null;
      const periodo = fim ? `${inicio} → ${fim}` : `${inicio} → hoje`;
      const foto = h.fotoURL && h.fotoURL.trim()
        ? `<img class="historico-foto" src="${h.fotoURL}" alt="${h.nome}">`
        : `<div class="historico-foto-placeholder">${h.nome}</div>`;

      return `
        <div class="historico-item">
          ${foto}
          <div class="historico-info">
            <div class="historico-nome">${h.nome}</div>
            <div class="historico-periodo">${periodo}</div>
          </div>
          ${isAtual ? '<span class="historico-atual-badge">atual</span>' : ''}
        </div>`;
    }).join('');
  }

  modal.style.display = 'flex';
}

function formatarDataHistorico(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

document.getElementById('btn-fechar-historico')?.addEventListener('click', () => {
  document.getElementById('modal-historico-assinatura').style.display = 'none';
});

document.getElementById('modal-historico-assinatura')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-historico-assinatura')) {
    document.getElementById('modal-historico-assinatura').style.display = 'none';
  }
});