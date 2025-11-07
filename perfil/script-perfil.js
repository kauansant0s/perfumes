// perfil/script-perfil.js
import { auth, buscarPerfumes, buscarPreferenciasUsuario, salvarPreferenciasUsuario } from '../adicionar-perfume/firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log('=== Script perfil carregado ===');

let perfumesData = [];
let usuarioAtual = null;
let preferenciasUsuario = null;

// Verifica se o usuário está logado
onAuthStateChanged(auth, async (user) => {
  console.log('=== onAuthStateChanged disparado ===');
  
  if (user) {
    usuarioAtual = user;
    console.log('Usuário logado:', user.email);
    
    const nomeUsuario = user.displayName || 'Usuário';
    document.getElementById('nome-usuario').textContent = nomeUsuario;
    
    if (user.photoURL) {
      document.getElementById('foto-perfil').src = user.photoURL;
    } else {
      document.getElementById('foto-perfil').src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect fill="%23d9d9d9" width="180" height="180"/></svg>';
    }
    
    configurarMenu(user);
    
    try {
      console.log('=== Carregando dados ===');
      await carregarPreferencias();
      await carregarPerfumes();
      console.log('=== ✅ Dados carregados com sucesso! ===');
    } catch (error) {
      console.error('=== ❌ Erro ao carregar dados ===', error);
      document.getElementById('nome-usuario').textContent = 'Erro ao carregar';
      alert('Erro ao carregar dados: ' + error.message);
    }
  } else {
    console.log('❌ Usuário não autenticado');
    window.location.href = '../login/login.html';
  }
});

function configurarMenu(user) {
  const menuFoto = document.getElementById('menu-foto');
  const menuNome = document.getElementById('menu-nome');
  
  if (user.photoURL) {
    menuFoto.src = user.photoURL;
  } else {
    menuFoto.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle fill="%23d9d9d9" cx="40" cy="40" r="40"/></svg>';
  }
  
  menuNome.textContent = user.displayName || 'Usuário';
  
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
  
  document.getElementById('menu-logout').addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('Deseja realmente sair?')) {
      try {
        await signOut(auth);
        window.location.href = '../login/login.html';
      } catch (error) {
        console.error('Erro ao sair:', error);
        alert('Erro ao fazer logout');
      }
    }
  });
}

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
    console.error('  ❌ Erro ao carregar preferências:', error);
    preferenciasUsuario = { top5: [] };
    throw error;
  }
}

async function carregarPerfumes() {
  try {
    console.log('  → Buscando perfumes...');
    perfumesData = await buscarPerfumes(usuarioAtual.uid);
    console.log('  → Perfumes recebidos:', perfumesData.length);
    
    renderizarPerfumes();
    
    if (preferenciasUsuario?.top5 && preferenciasUsuario.top5.length > 0) {
      renderizarTop5(preferenciasUsuario.top5);
    } else {
      const secaoTop5 = document.getElementById('top5');
      if (secaoTop5) {
        secaoTop5.innerHTML = '';
        const btnAdicionar = document.createElement('button');
        btnAdicionar.className = 'btn-adicionar-perfume';
        btnAdicionar.textContent = '+';
        btnAdicionar.onclick = abrirModalTop5;
        secaoTop5.appendChild(btnAdicionar);
      }
    }
    
    if (!preferenciasUsuario?.assinaturaAtual) {
      const placeholder = document.querySelector('.perfume-placeholder');
      if (placeholder) {
        placeholder.parentElement.style.cursor = 'pointer';
        placeholder.parentElement.onclick = abrirModalAssinatura;
      }
    }
  } catch (error) {
    console.error('  ❌ Erro ao carregar perfumes:', error);
    throw error;
  }
}

function renderizarPerfumes() {
  const tenho = perfumesData.filter(p => p.status === 'tenho');
  const jaTive = perfumesData.filter(p => p.status === 'ja-tive');
  const queroTer = perfumesData.filter(p => p.status === 'quero-ter');
  
  renderizarSecao('tenho', tenho);
  renderizarSecao('ja-tive', jaTive);
  renderizarSecao('quero-ter', queroTer);
  renderizarSecao('todos', perfumesData);
}

function renderizarSecao(secaoId, perfumes) {
  const secao = document.getElementById(secaoId);
  if (!secao) return;
  
  secao.innerHTML = '';
  
  perfumes.slice(0, 7).forEach(perfume => {
    const card = criarCardPerfume(perfume);
    secao.appendChild(card);
  });
  
  if (perfumes.length < 7) {
    const btnAdicionar = document.createElement('button');
    btnAdicionar.className = 'btn-adicionar-perfume';
    btnAdicionar.textContent = '+';
    btnAdicionar.onclick = () => abrirModalAdicionar(secaoId);
    secao.appendChild(btnAdicionar);
  } else {
    const btnVerTodos = document.createElement('button');
    btnVerTodos.className = 'btn-ver-todos';
    btnVerTodos.textContent = 'Ver todos';
    // ✅ ATUALIZADO: Passa o filtro específico na URL
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

function criarCardPerfume(perfume) {
  const card = document.createElement('div');
  card.className = 'perfume-card';
  card.title = perfume.nome;
  card.style.cursor = 'pointer';
  
  card.onclick = () => {
    window.location.href = `../perfumes/perfume.html?id=${perfume.id}`;
  };
  
  if (perfume.fotoURL && perfume.fotoURL.trim() !== '') {
    const img = document.createElement('img');
    img.src = perfume.fotoURL;
    img.alt = perfume.nome;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    
    img.onerror = () => {
      card.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#666;text-align:center;padding:5px;background:#d9d9d9;">${perfume.nome}</div>`;
    };
    
    card.appendChild(img);
  } else {
    card.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#666;text-align:center;padding:5px;background:#d9d9d9;">${perfume.nome}</div>`;
  }
  
  return card;
}

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
    btnAdicionar.onclick = abrirModalTop5;
    secao.appendChild(btnAdicionar);
  }
}

async function definirAssinaturaAtual(perfume) {
  console.log('Definindo assinatura:', perfume.nome);
  
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
    alert('Erro ao salvar assinatura: ' + error.message);
  }
}

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
      const card = document.createElement('div');
      card.className = 'perfume-modal-card';
      card.onclick = async () => {
        await definirAssinaturaAtual(perfume);
        modal.style.display = 'none';
        titulo.textContent = 'Adicionar ao Top 5';
      };
      
      card.innerHTML = `
        <div class="perfume-modal-img">
          ${perfume.fotoURL ? `<img src="${perfume.fotoURL}" alt="${perfume.nome}">` : `<div style="background:#d9d9d9;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#666;padding:5px;text-align:center;">${perfume.nome}</div>`}
        </div>
        <div class="perfume-modal-nome">${perfume.nome}</div>
      `;
      
      lista.appendChild(card);
    });
  }
  
  modal.style.display = 'flex';
}

function abrirModalAdicionar(tipo) {
  const modal = document.getElementById('modal-adicionar');
  const lista = document.getElementById('lista-perfumes-modal');
  
  lista.innerHTML = '';
  
  if (perfumesData.length === 0) {
    lista.innerHTML = '<p style="text-align:center;color:#666;">Você ainda não cadastrou nenhum perfume</p>';
  } else {
    perfumesData.forEach(perfume => {
      const card = document.createElement('div');
      card.className = 'perfume-modal-card';
      card.onclick = () => {
        modal.style.display = 'none';
      };
      
      card.innerHTML = `
        <div class="perfume-modal-img">
          ${perfume.fotoURL ? `<img src="${perfume.fotoURL}" alt="${perfume.nome}">` : `<div style="background:#d9d9d9;width:100%;height:100%;"></div>`}
        </div>
        <div class="perfume-modal-nome">${perfume.nome}</div>
      `;
      
      lista.appendChild(card);
    });
  }
  
  modal.style.display = 'flex';
}

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
      const card = document.createElement('div');
      card.className = 'perfume-modal-card';
      
      const jaEstaNoTop5 = top5Atual.includes(perfume.id);
      
      if (jaEstaNoTop5) {
        card.style.opacity = '0.5';
        card.style.cursor = 'not-allowed';
        card.title = 'Já está no Top 5';
      } else {
        card.onclick = async () => {
          if (top5Atual.length >= 5) {
            alert('Você já tem 5 perfumes no Top 5!');
            return;
          }
          
          const novoTop5 = [...top5Atual, perfume.id];
          
          try {
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
            alert('Erro ao adicionar: ' + error.message);
          }
        };
      }
      
      card.innerHTML = `
        <div class="perfume-modal-img">
          ${perfume.fotoURL ? `<img src="${perfume.fotoURL}" alt="${perfume.nome}">` : `<div style="background:#d9d9d9;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#666;padding:5px;text-align:center;">${perfume.nome}</div>`}
        </div>
        <div class="perfume-modal-nome">${perfume.nome}</div>
      `;
      
      lista.appendChild(card);
    });
  }
  
  modal.style.display = 'flex';
}

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

document.getElementById('btn-cadastrar')?.addEventListener('click', () => {
  window.location.href = '../adicionar-perfume/form-add-perf.html';
});

document.getElementById('btn-cadastrar-novo')?.addEventListener('click', () => {
  window.location.href = '../adicionar-perfume/form-add-perf.html';
});

// Botão Editar Perfil
document.getElementById('btn-editar-perfil')?.addEventListener('click', () => {
  window.location.href = '../criar-conta/criar-conta.html?editar=true';
});