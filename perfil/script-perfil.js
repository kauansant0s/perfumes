// script-perfil.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
const auth = getAuth(app);
const db = getFirestore(app);

let perfumesData = [];
let usuarioAtual = null;

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
    
    await carregarPerfumes();
  } else {
    window.location.href = '../login/login.html';
  }
});

// Carrega perfumes do Firebase
async function carregarPerfumes() {
  try {
    const querySnapshot = await getDocs(collection(db, "perfumes"));
    perfumesData = [];
    
    querySnapshot.forEach((doc) => {
      perfumesData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Perfumes carregados:', perfumesData);
    renderizarPerfumes();
    carregarAssinaturaAtual();
  } catch (error) {
    console.error('Erro ao carregar perfumes:', error);
  }
}

// Renderiza perfumes nas seções
function renderizarPerfumes() {
  const tenho = perfumesData.filter(p => p.status === 'tenho');
  const jaTive = perfumesData.filter(p => p.status === 'ja-tive');
  const queroTer = perfumesData.filter(p => p.status === 'quero-ter');
  
  console.log('Tenho:', tenho);
  console.log('Já tive:', jaTive);
  console.log('Quero ter:', queroTer);
  
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
  console.log('Criando card para:', perfume.nome, 'URL:', perfume.fotoURL);
  
  const card = document.createElement('div');
  card.className = 'perfume-card';
  card.title = perfume.nome; // Tooltip com o nome
  
  if (perfume.fotoURL && perfume.fotoURL.trim() !== '') {
    const img = document.createElement('img');
    img.src = perfume.fotoURL;
    img.alt = perfume.nome;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    
    img.onload = () => {
      console.log('Imagem carregada com sucesso:', perfume.nome);
    };
    
    img.onerror = () => {
      console.error('ERRO ao carregar imagem:', perfume.fotoURL);
      card.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#666;text-align:center;padding:5px;background:#d9d9d9;">${perfume.nome}</div>`;
    };
    
    card.appendChild(img);
  } else {
    console.log('Sem foto URL para:', perfume.nome);
    card.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#666;text-align:center;padding:5px;background:#d9d9d9;">${perfume.nome}</div>`;
  }
  
  return card;
}

// Define perfume como assinatura atual
function definirAssinaturaAtual(perfume) {
  console.log('Definindo assinatura atual:', perfume.nome);
  
  const container = document.getElementById('perfume-assinatura');
  container.innerHTML = '';
  
  // Cria mini card do perfume (clicável para mudar)
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
  
  // Salva no localStorage para persistir
  localStorage.setItem('assinaturaAtual', JSON.stringify({
    id: perfume.id,
    nome: perfume.nome,
    fotoURL: perfume.fotoURL
  }));
}

// Carrega assinatura atual salva
function carregarAssinaturaAtual() {
  const assinatura = localStorage.getItem('assinaturaAtual');
  if (assinatura) {
    const perfume = JSON.parse(assinatura);
    definirAssinaturaAtual(perfume);
  } else {
    // Se não tem assinatura, torna o placeholder clicável
    const placeholder = document.querySelector('.perfume-placeholder');
    if (placeholder) {
      placeholder.parentElement.style.cursor = 'pointer';
      placeholder.parentElement.onclick = abrirModalAssinatura;
    }
  }
}

// Abre modal para escolher assinatura
function abrirModalAssinatura() {
  const modal = document.getElementById('modal-top5'); // Reutiliza o modal do top5
  const lista = document.getElementById('lista-perfumes-top5');
  const titulo = modal.querySelector('h3');
  
  titulo.textContent = 'Escolher assinatura atual';
  lista.innerHTML = '';
  
  perfumesData.forEach(perfume => {
    const card = document.createElement('div');
    card.className = 'perfume-modal-card';
    card.onclick = () => {
      definirAssinaturaAtual(perfume);
      modal.style.display = 'none';
      titulo.textContent = 'Adicionar ao Top 5'; // Restaura o título
    };
    
    card.innerHTML = `
      <div class="perfume-modal-img">
        ${perfume.fotoURL ? `<img src="${perfume.fotoURL}" alt="${perfume.nome}">` : ''}
      </div>
      <div class="perfume-modal-nome">${perfume.nome}</div>
    `;
    
    lista.appendChild(card);
  });
  
  modal.style.display = 'flex';
}

// Modal adicionar perfume
function abrirModalAdicionar(tipo) {
  const modal = document.getElementById('modal-adicionar');
  const lista = document.getElementById('lista-perfumes-modal');
  
  lista.innerHTML = '';
  
  perfumesData.forEach(perfume => {
    const card = document.createElement('div');
    card.className = 'perfume-modal-card';
    card.onclick = () => {
      console.log('Perfume selecionado:', perfume.nome);
      modal.style.display = 'none';
      // Aqui você adicionaria a lógica para atualizar o status do perfume
    };
    
    card.innerHTML = `
      <div class="perfume-modal-img">
        ${perfume.fotoURL ? `<img src="${perfume.fotoURL}" alt="${perfume.nome}">` : ''}
      </div>
      <div class="perfume-modal-nome">${perfume.nome}</div>
    `;
    
    lista.appendChild(card);
  });
  
  modal.style.display = 'flex';
}

// Modal Top 5
document.querySelector('.lista-perfumes#top5 .btn-adicionar-perfume').onclick = () => {
  const modal = document.getElementById('modal-top5');
  const lista = document.getElementById('lista-perfumes-top5');
  
  lista.innerHTML = '';
  
  perfumesData.forEach(perfume => {
    const card = document.createElement('div');
    card.className = 'perfume-modal-card';
    card.onclick = () => {
      console.log('Adicionado ao Top 5:', perfume.nome);
      modal.style.display = 'none';
    };
    
    card.innerHTML = `
      <div class="perfume-modal-img">
        ${perfume.fotoURL ? `<img src="${perfume.fotoURL}" alt="${perfume.nome}">` : ''}
      </div>
      <div class="perfume-modal-nome">${perfume.nome}</div>
    `;
    
    lista.appendChild(card);
  });
  
  modal.style.display = 'flex';
};

// Fechar modais
document.querySelector('.close').onclick = () => {
  document.getElementById('modal-adicionar').style.display = 'none';
};

document.querySelector('.close-top5').onclick = () => {
  document.getElementById('modal-top5').style.display = 'none';
};

window.onclick = (event) => {
  const modalAdicionar = document.getElementById('modal-adicionar');
  const modalTop5 = document.getElementById('modal-top5');
  
  if (event.target === modalAdicionar) {
    modalAdicionar.style.display = 'none';
  }
  if (event.target === modalTop5) {
    modalTop5.style.display = 'none';
  }
};

// Botão cadastrar novo perfume
document.getElementById('btn-cadastrar').onclick = () => {
  window.location.href = '../adicionar-perfume/form-add-perf.html';
};

document.getElementById('btn-cadastrar-novo').onclick = () => {
  window.location.href = '../adicionar-perfume/form-add-perf.html';
};