// perfil/script-perfil.js
import { auth, buscarPerfumes, buscarPreferenciasUsuario, salvarPreferenciasUsuario } from '../adicionar-perfume/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log('=== Script perfil carregado ===');
console.log('Auth importado:', auth);

let perfumesData = [];
let usuarioAtual = null;
let preferenciasUsuario = null;

// Adiciona timeout para debug
setTimeout(() => {
  console.log('Verificando auth após 2s:', auth.currentUser);
}, 2000);

// Verifica se o usuário está logado
onAuthStateChanged(auth, async (user) => {
  console.log('=== onAuthStateChanged disparado ===');
  console.log('Estado de autenticação:', user ? 'Logado' : 'Não logado');
  
  if (user) {
    usuarioAtual = user;
    console.log('Usuário logado:', user.email);
    console.log('UID:', user.uid);
    
    document.getElementById('nome-usuario').textContent = user.displayName || 'Usuário';
    
    if (user.photoURL) {
      document.getElementById('foto-perfil').src = user.photoURL;
    } else {
      document.getElementById('foto-perfil').src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect fill="%23d9d9d9" width="180" height="180"/></svg>';
    }
    
    try {
      console.log('=== Iniciando carregamento de dados ===');
      
      console.log('1. Carregando preferências...');
      await carregarPreferencias();
      console.log('✅ Preferências carregadas');
      
      console.log('2. Carregando perfumes...');
      await carregarPerfumes();
      console.log('✅ Perfumes carregados');
      
      console.log('=== ✅ TUDO CARREGADO COM SUCESSO! ===');
    } catch (error) {
      console.error('=== ❌ ERRO AO CARREGAR DADOS ===');
      console.error('Erro completo:', error);
      console.error('Stack:', error.stack);
      
      // Remove o "Carregando..." e mostra erro
      document.getElementById('nome-usuario').textContent = 'Erro ao carregar';
      alert('Erro ao carregar dados. Abra o Console (F12) e me envie os erros em vermelho.');
    }
  } else {
    console.log('❌ Usuário não autenticado, redirecionando para login...');
    window.location.href = '../login/login.html';
  }
});

async function carregarPreferencias() {
  try {
    console.log('  → Buscando preferências do usuário:', usuarioAtual.uid);
    preferenciasUsuario = await buscarPreferenciasUsuario(usuarioAtual.uid);
    console.log('  → Preferências recebidas:', preferenciasUsuario);
    
    if (preferenciasUsuario) {
      if (preferenciasUsuario.assinaturaAtual) {
        console.log('  → Carregando assinatura atual:', preferenciasUsuario.assinaturaAtual);
        carregarAssinaturaAtual(preferenciasUsuario.assinaturaAtual);
      } else {
        console.log('  → Sem assinatura salva');
      }
      
      if (preferenciasUsuario.top5) {
        console.log('  → Top 5 salvo:', preferenciasUsuario.top5);
      }
    } else {
      console.log('  → Nenhuma preferência salva, criando objeto vazio');
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
    console.log('  → Buscando perfumes do usuário:', usuarioAtual.uid);
    perfumesData = await buscarPerfumes(usuarioAtual.uid);
    console.log('  → Perfumes recebidos:', perfumesData.length, 'perfume(s)');
    
    if (perfumesData.length > 0) {
      console.log('  → Lista de perfumes:');
      perfumesData.forEach((p, i) => {
        console.log(`     ${i+1}. ${p.nome} (${p.marca}) - Status: ${p.status}`);
      });
    } else {
      console.log('  → Nenhum perfume cadastrado ainda');
    }
    
    console.log('  → Renderizando perfumes nas seções...');
    renderizarPerfumes();
    
    if (preferenciasUsuario?.top5 && preferenciasUsuario.top5.length > 0) {
      console.log('  → Renderizando Top 5 existente:', preferenciasUsuario.top5);
      renderizarTop5(preferenciasUsuario.top5);
    } else {
      console.log('  → Criando botão + para Top 5');
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
  console.log('Renderizando perfumes...');
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
  if (!secao) {
    console.warn('Seção não encontrada:', secaoId);
    return;
  }
  
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
  card.style.cursor = 'pointer';
  
  // Adiciona evento de clique para abrir página do perfume
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
  console.log('Renderizando Top 5 com IDs:', top5Ids);
  const secao = document.getElementById('top5');
  if (!secao) return;
  
  secao.innerHTML = '';
  
  const perfumesTop5 = perfumesData.filter(p => top5Ids.includes(p.id));
  console.log('Perfumes encontrados para Top 5:', perfumesTop5.length);
  
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
  
  // IMPORTANTE: Preserva o top5 existente ao salvar assinatura
  try {
    const novaAssinatura = {
      id: perfume.id,
      nome: perfume.nome,
      fotoURL: perfume.fotoURL
    };
    
    // Se já tem preferências, preserva o top5
    const dadosParaSalvar = preferenciasUsuario?.top5 
      ? { 
          assinaturaAtual: novaAssinatura,
          top5: preferenciasUsuario.top5  // Preserva o top5
        }
      : { 
          assinaturaAtual: novaAssinatura 
        };
    
    console.log('Salvando preferências:', dadosParaSalvar);
    await salvarPreferenciasUsuario(usuarioAtual.uid, dadosParaSalvar);
    
    // Atualiza localmente
    if (!preferenciasUsuario) {
      preferenciasUsuario = {};
    }
    preferenciasUsuario.assinaturaAtual = novaAssinatura;
    
    console.log('✅ Assinatura salva no Firestore!');
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
      card.onclick = async () => {
        console.log('Perfume selecionado:', perfume.nome);
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
  console.log('=== Abrindo Modal Top 5 ===');
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
            // IMPORTANTE: Preserva a assinatura ao salvar top5
            const dadosParaSalvar = preferenciasUsuario?.assinaturaAtual 
              ? { 
                  top5: novoTop5,
                  assinaturaAtual: preferenciasUsuario.assinaturaAtual  // Preserva assinatura
                }
              : { 
                  top5: novoTop5 
                };
            
            console.log('Salvando top5:', dadosParaSalvar);
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