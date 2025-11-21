// perfil/script-perfil.js - Otimizado
import { auth, buscarPerfumes, buscarPreferenciasUsuario, salvarPreferenciasUsuario } from '../adicionar-perfume/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { configurarMenuLateral, toggleLoading, criarPlaceholder } from '../adicionar-perfume/utils.js';

console.log('=== Script perfil carregado ===');

let perfumesData = [];
let usuarioAtual = null;
let preferenciasUsuario = null;

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
  
  renderizarSecao('tenho', tenho);
  renderizarSecao('ja-tive', jaTive);
  renderizarSecao('quero-ter', queroTer);
  renderizarSecao('todos', perfumesData);
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
  card.title = perfume.nome;
  
  // ✅ NOVO: Usa <a> ao invés de onclick
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
    const card = criarCardPerfume(perfume);
    secao.appendChild(card);
  });
  
  if (perfumesTop5.length < 5) {
    const btnAdicionar = document.createElement('button');
    btnAdicionar.className = 'btn-adicionar-perfume';
    btnAdicionar.textContent = '+';
    btnAdicionar.setAttribute('aria-label', 'Adicionar ao Top 5');
    btnAdicionar.onclick = abrirModalTop5;
    secao.appendChild(btnAdicionar);
  }
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
  }
}

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
    const novaAssinatura = {
      id: perfume.id,
      nome: perfume.nome,
      fotoURL: perfume.fotoURL
    };
    
    const dadosParaSalvar = preferenciasUsuario?.top5 
      ? { 
          assinaturaAtual: novaAssinatura,
          top5: preferenciasUsuario.top5
        }
      : { 
          assinaturaAtual: novaAssinatura 
        };
    
    await salvarPreferenciasUsuario(usuarioAtual.uid, dadosParaSalvar);
    
    if (!preferenciasUsuario) {
      preferenciasUsuario = {};
    }
    preferenciasUsuario.assinaturaAtual = novaAssinatura;
    
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
    
    container.appendChild(miniCard);
    container.appendChild(nome);
  }
}

/**
 * Abre modal para escolher assinatura
 */
function abrirModalAssinatura() {
  const modal = document.getElementById('modal-top5');
  const lista = document.getElementById('lista-perfumes-top5');
  const titulo = modal.querySelector('h3');
  
  titulo.textContent = 'Escolher assinatura atual';
  lista.innerHTML = '';
  
  if (perfumesData.length === 0) {
    lista.innerHTML = '<p style="text-align:center;color:#666;">Você ainda não cadastrou nenhum perfume</p>';
  } else {
    perfumesData.forEach(perfume => {
      const card = criarCardModal(perfume, async () => {
        await definirAssinaturaAtual(perfume);
        modal.style.display = 'none';
        titulo.textContent = 'Adicionar ao Top 5';
      });
      lista.appendChild(card);
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

/**
 * Abre modal Top 5
 */
async function abrirModalTop5() {
  const modal = document.getElementById('modal-top5');
  const lista = document.getElementById('lista-perfumes-top5');
  const titulo = modal.querySelector('h3');
  
  titulo.textContent = 'Adicionar ao Top 5';
  lista.innerHTML = '';
  
  const top5Atual = preferenciasUsuario?.top5 || [];
  
  if (perfumesData.length === 0) {
    lista.innerHTML = '<p style="text-align:center;color:#666;">Você ainda não cadastrou nenhum perfume</p>';
  } else {
    perfumesData.forEach(perfume => {
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