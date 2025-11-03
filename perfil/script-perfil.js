// script-perfil.js
import { auth, db, buscarPerfumes, buscarPreferenciasUsuario, salvarPreferenciasUsuario } from '../firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let perfumesData = [];
let usuarioAtual = null;
let preferenciasUsuario = null;

// Verifica se o usuário está logado
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioAtual = user;
    document.getElementById('nome-usuario').textContent = user.displayName || 'Usuário';
    
    if (user.photoURL) {
      document.getElementById('foto-perfil').src = user.photoURL;
    } else {
      document.getElementById('foto-perfil').src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect fill="%23d9d9d9" width="180" height="180"/></svg>';
    }
    
    // Carrega preferências do usuário
    await carregarPreferencias();
    
    // Carrega perfumes do usuário
    await carregarPerfumes();
  } else {
    window.location.href = '../login/login.html';
  }
});

// Carrega preferências (Top 5 e Assinatura)
async function carregarPreferencias() {
  try {
    preferenciasUsuario = await buscarPreferenciasUsuario(usuarioAtual.uid);
    console.log('Preferências carregadas:', preferenciasUsuario);
    
    if (preferenciasUsuario) {
      // Carrega assinatura atual
      if (preferenciasUsuario.assinaturaAtual) {
        carregarAssinaturaAtual(preferenciasUsuario.assinaturaAtual);
      }
      
      // Carrega Top 5
      if (preferenciasUsuario.top5 && preferenciasUsuario.top5.length > 0) {
        renderizarTop5(preferenciasUsuario.top5);
      }
    }
  } catch (error) {
    console.error('Erro ao carregar preferências:', error);
  }
}

// Carrega perfumes do Firebase (APENAS DO USUÁRIO)
async function carregarPerfumes() {
  try {
    perfumesData = await buscarPerfumes(usuarioAtual.uid);
    console.log('Perfumes carregados:', perfumesData);
    renderizarPerfumes();
    
    // Se não tem assinatura ainda, torna placeholder clicável
    if (!preferenciasUsuario?.assinaturaAtual) {
      const placeholder = document.querySelector('.perfume-placeholder');
      if (placeholder) {
        placeholder.parentElement.style.cursor = 'pointer';
        placeholder.parentElement.onclick = abrirModalAssinatura;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar perfumes:', error);
  }
}

// Renderiza perfumes nas seções
function renderizarPerfumes() {
  const tenho = perfumesData.filter(p => p.status === 'tenho');
  const jaTive = perfumesData.filter(p => p.status === 'ja-tive');
  const queroTer = perfumesData.filter(p => p.status === 'quero-ter');
  
  console.log('Tenho:', tenho.length);
  console.log('Já tive:', jaTive.length);
  console.log('Quero ter:', queroTer.length);
  
  renderizarSecao('tenho', tenho);
  renderizarSecao('ja-tive', jaTive);
  renderizarSecao('quero-ter', queroTer);
  renderizarSecao('todos', perfumesData);
}

function renderizarSecao(secaoId, perfumes) {
  const secao = document.getElementById(secaoId);
  secao.innerHTML = '';
  
  // Adiciona perfumes
  perfumes.slice(0, 7).forEach(perfume => {
    const card = criarCardPerfume(perfume);
    secao.appendChild(card);
  });
  
  // Adiciona botão adicionar ou ver todos
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
    btnVerTodos.onclick = () => {
      alert('Página "Ver todos" ainda não implementada');
    };
    secao.appendChild(btnVerTodos);
  }
}

function criarCardPerfume(perfume) {
  const card = document.createElement('div');
  card.className = 'perfume-card';
  card.title = perfume.nome;
  
  if (perfume.fotoURL && perfume.fotoURL.trim() !== '') {
    const img = document.createElement('img');
    img.src = perfume.fotoURL;
    img.alt = perfume.nome;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    
    img.onerror = () => {
      console.error('Erro ao carregar imagem:', perfume.fotoURL);
      card.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#666;text-align:center;padding:5px;background:#d9d9d9;">${perfume.nome}</div>`;
    };
    
    card.appendChild(img);
  } else {
    card.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#666;text-align:center;padding:5px;background:#d9d9d9;">${perfume.nome}</div>`;
  }
  
  return card;
}

// Renderiza Top 5
function renderizarTop5(top5Ids) {
  const secao = document.getElementById('top5');
  secao.innerHTML = '';
  
  // Filtra perfumes que estão no Top 5
  const perfumesTop5 = perfumesData.filter(p => top5Ids.includes(p.id));
  
  perfumesTop5.forEach(perfume => {
    const card = criarCardPerfume(perfume);
    secao.appendChild(card);
  });
  
  // Adiciona botão + se ainda não tem 5
  if (perfumesTop5.length < 5) {
    const btnAdicionar = document.createElement('button');
    btnAdicionar.className = 'btn-adicionar-perfume';
    btnAdicionar.textContent = '+';
    btnAdicionar.onclick = abrirModalTop5;
    secao.appendChild(btnAdicionar);
  }
}

// Salva assinatura atual no Firestore
async function definirAssinaturaAtual(perfume) {
  console.log('Definindo assinatura atual:', perfume.nome);
  
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
  
  // Salva no Firestore
  try {
    await salvarPreferenciasUsuario(usuarioAtual.uid, {
      assinaturaAtual: {
        id: perfume.id,
        nome: perfume.nome,
        fotoURL: perfume.fotoURL
      }
    });
    
    console.log('Assinatura salva no Firestore!');
  } catch (error) {
    console.error('Erro ao salvar assinatura:', error);
  }
}

// Carrega assinatura atual
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

// Abre modal para escolher assinatura
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

// Modal adicionar perfume
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
      card.onclick = async () => {
        console.log('Perfume selecionado:', perfume.nome);
        // TODO: Implementar atualização de status
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

// Modal Top 5
async function abrirModalTop5() {
  console.log('=== Abrindo Modal Top 5 ===');
  const modal = document.getElementById('modal-top5');
  const lista = document.getElementById('lista-perfumes-top5');
  const titulo = modal.querySelector('h3');
  
  titulo.textContent = 'Adicionar ao Top 5';
  lista.innerHTML = '';
  
  // Pega IDs já no Top 5
  const top5Atual = preferenciasUsuario?.top5 || [];
  console.log('Top 5 atual:', top5Atual);
  console.log('Perfumes disponíveis:', perfumesData.length);
  
  if (perfumesData.length === 0) {
    lista.innerHTML = '<p style="text-align:center;color:#666;">Você ainda não cadastrou nenhum perfume</p>';
  } else {
    perfumesData.forEach(perfume => {
      const card = document.createElement('div');
      card.className = 'perfume-modal-card';
      
      const jaEstaNoTop5 = top5Atual.includes(perfume.id);
      console.log(`Perfume ${perfume.nome}: já está no top5? ${jaEstaNoTop5}`);
      
      // Marca se já está no Top 5
      if (jaEstaNoTop5) {
        card.style.opacity = '0.5';
        card.style.cursor = 'not-allowed';
        card.title = 'Já está no Top 5';
      } else {
        card.onclick = async () => {
          console.log('Clicou em:', perfume.nome);
          
          if (top5Atual.length >= 5) {
            alert('Você já tem 5 perfumes no Top 5!');
            return;
          }
          
          // Adiciona ao Top 5
          const novoTop5 = [...top5Atual, perfume.id];
          console.log('Novo Top 5:', novoTop5);
          
          try {
            // Salva no Firestore
            await salvarPreferenciasUsuario(usuarioAtual.uid, {
              top5: novoTop5
            });
            
            console.log('✅ Top 5 salvo no Firestore!');
            
            // Atualiza local
            if (!preferenciasUsuario) {
              preferenciasUsuario = { top5: [] };
            }
            preferenciasUsuario.top5 = novoTop5;
            
            // Re-renderiza o Top 5
            renderizarTop5(novoTop5);
            
            // Fecha o modal
            modal.style.display = 'none';
            
            console.log('✅ Perfume adicionado ao Top 5 com sucesso!');
          } catch (error) {
            console.error('❌ Erro ao salvar Top 5:', error);
            alert('Erro ao adicionar perfume ao Top 5: ' + error.message);
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

// Inicializa botão Top 5
document.querySelector('.lista-perfumes#top5 .btn-adicionar-perfume')?.addEventListener('click', abrirModalTop5);

// Fechar modais
document.querySelector('.close').onclick = () => {
  document.getElementById('modal-adicionar').style.display = 'none';
};

document.querySelector('.close-top5').onclick = () => {
  const modal = document.getElementById('modal-top5');
  modal.style.display = 'none';
  modal.querySelector('h3').textContent = 'Adicionar ao Top 5';
};

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

// Botão cadastrar novo perfume
document.getElementById('btn-cadastrar').onclick = () => {
  window.location.href = '../adicionar-perfume/form-add-perf.html';
};

document.getElementById('btn-cadastrar-novo').onclick = () => {
  window.location.href = '../adicionar-perfume/form-add-perf.html';
};