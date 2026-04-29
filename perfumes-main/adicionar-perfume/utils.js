// utils.js - Funções utilitárias compartilhadas
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/**
 * Configura o menu lateral em todas as páginas
 * @param {Object} auth - Instância do Firebase Auth
 * @param {Object} user - Usuário autenticado
 */
export function configurarMenuLateral(auth, user) {
  const menuFoto = document.getElementById('menu-foto');
  const menuNome = document.getElementById('menu-nome');
  const menuToggle = document.getElementById('menu-toggle');
  const menuLateral = document.getElementById('menu-lateral');
  const menuOverlay = document.getElementById('menu-overlay');
  
  if (!menuFoto || !menuNome) return;
  
  // Configura foto e nome
  if (user.photoURL) {
    menuFoto.src = user.photoURL;
  } else {
    menuFoto.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle fill="%23d9d9d9" cx="40" cy="40" r="40"/></svg>';
  }
  
  menuNome.textContent = user.displayName || 'Usuário';
  
  // Toggle menu
  if (menuToggle && menuLateral && menuOverlay) {
    menuToggle.addEventListener('click', () => {
      menuLateral.classList.toggle('aberto');
      menuOverlay.classList.toggle('ativo');
      
      // Atualiza aria-expanded
      const isOpen = menuLateral.classList.contains('aberto');
      menuToggle.setAttribute('aria-expanded', isOpen);
    });
    
    menuOverlay.addEventListener('click', () => {
      menuLateral.classList.remove('aberto');
      menuOverlay.classList.remove('ativo');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  }
  
  // Logout
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
 * Mostra/oculta indicador de loading
 * @param {boolean} show - Se deve mostrar ou ocultar
 * @param {string} containerId - ID do container (opcional)
 */
export function toggleLoading(show, containerId = 'body') {
  let loadingEl = document.getElementById('loading-overlay');
  
  if (!loadingEl) {
    // Cria overlay de loading se não existir
    loadingEl = document.createElement('div');
    loadingEl.id = 'loading-overlay';
    loadingEl.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                  background: rgba(0,0,0,0.7); display: flex; align-items: center; 
                  justify-content: center; z-index: 9999;">
        <div style="background: #fff; padding: 30px; border-radius: 16px; 
                    display: flex; flex-direction: column; align-items: center; gap: 15px;">
          <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; 
                      border-top: 4px solid #C06060; border-radius: 50%; 
                      animation: spin 1s linear infinite;"></div>
          <span style="color: #333; font-size: 16px;">Carregando...</span>
        </div>
      </div>
    `;
    
    // Adiciona animação
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(loadingEl);
  }
  
  loadingEl.style.display = show ? 'block' : 'none';
}

/**
 * Debounce - executa função após delay
 * @param {Function} func - Função a executar
 * @param {number} delay - Delay em ms
 * @returns {Function}
 */
export function debounce(func, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Tratamento de erros do Firebase
 * @param {Error} error - Erro do Firebase
 * @returns {string} Mensagem amigável
 */
export function tratarErroFirebase(error) {
  console.error('Erro Firebase:', error);
  
  const mensagens = {
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-email': 'Email inválido.',
    'auth/email-already-in-use': 'Este email já está em uso.',
    'auth/weak-password': 'Senha muito fraca. Use pelo menos 8 caracteres.',
    'auth/user-disabled': 'Esta conta foi desativada.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
    'auth/invalid-credential': 'Email ou senha incorretos.',
    'permission-denied': 'Você não tem permissão para realizar esta ação.',
    'unavailable': 'Erro de conexão. Verifique sua internet.',
    'not-found': 'Documento não encontrado.',
    'unauthenticated': 'Você precisa estar logado.'
  };
  
  return mensagens[error.code] || error.message || 'Erro desconhecido.';
}

/**
 * Valida campos obrigatórios
 * @param {Object} dados - Objeto com dados
 * @param {Array} camposObrigatorios - Array com nomes dos campos
 * @returns {Object} { valido: boolean, erros: Array }
 */
export function validarCampos(dados, camposObrigatorios) {
  const erros = [];
  
  camposObrigatorios.forEach(campo => {
    if (!dados[campo] || (typeof dados[campo] === 'string' && dados[campo].trim() === '')) {
      erros.push(`O campo "${campo}" é obrigatório.`);
    }
  });
  
  return {
    valido: erros.length === 0,
    erros
  };
}

/**
 * Formata data do Firestore para string legível
 * @param {Object} timestamp - Timestamp do Firestore
 * @returns {string}
 */
export function formatarData(timestamp) {
  if (!timestamp || !timestamp.toDate) return '';
  
  const data = timestamp.toDate();
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(data);
}

/**
 * Cria imagem placeholder SVG
 * @param {string} texto - Texto a exibir
 * @param {number} tamanho - Tamanho em pixels
 * @returns {string} Data URL
 */
export function criarPlaceholder(texto = '', tamanho = 100) {
  return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}">
    <rect fill="%23d9d9d9" width="${tamanho}" height="${tamanho}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" 
          font-size="${tamanho * 0.15}" font-family="Inter">${encodeURIComponent(texto)}</text>
  </svg>`;
}

/**
 * Verifica se imagem existe
 * @param {string} url - URL da imagem
 * @returns {Promise<boolean>}
 */
export function verificarImagem(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * Sanitiza string para busca (remove acentos, converte para minúsculas)
 * @param {string} str - String para sanitizar
 * @returns {string}
 */
export function sanitizarBusca(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// utils.js - Adicione estas funções ao arquivo utils.js

/**
 * ✅ NOVO: Baixa imagem de URL e salva no Firebase Storage
 * @param {string} imageUrl - URL da imagem externa
 * @param {string} userId - ID do usuário
 * @param {string} tipo - 'perfume' ou 'marca'
 * @param {string} nome - Nome do perfume/marca (para o nome do arquivo)
 * @returns {Promise<string>} URL da imagem no Firebase Storage
 */
export async function baixarESalvarImagem(imageUrl, userId, tipo = 'perfume', nome = '') {
  try {
    console.log('📥 Baixando imagem:', imageUrl);
    
    // 1. Baixa a imagem
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error('Erro ao baixar imagem');
    }
    
    // 2. Converte para Blob
    const blob = await response.blob();
    
    // Valida tamanho (máx 5MB)
    if (blob.size > 5 * 1024 * 1024) {
      throw new Error('Imagem muito grande (máx 5MB)');
    }
    
    // 3. Gera nome único para o arquivo
    const timestamp = Date.now();
    const extensao = obterExtensaoImagem(imageUrl, blob.type);
    const nomeLimpo = nome.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const nomeArquivo = `${nomeLimpo}_${timestamp}.${extensao}`;
    
    // 4. Faz upload para o Firebase Storage
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js"
    );
    
    const storage = getStorage();
    const caminho = `${tipo}s/${userId}/${nomeArquivo}`;
    const storageRef = ref(storage, caminho);
    
    console.log('📤 Fazendo upload para:', caminho);
    
    await uploadBytes(storageRef, blob);
    const urlFirebase = await getDownloadURL(storageRef);
    
    console.log('✅ Imagem salva no Firebase:', urlFirebase);
    
    return urlFirebase;
    
  } catch (error) {
    console.error('❌ Erro ao baixar/salvar imagem:', error);
    throw error;
  }
}

/**
 * Obtém extensão da imagem
 */
function obterExtensaoImagem(url, mimeType) {
  // Tenta pela URL primeiro
  const urlMatch = url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
  if (urlMatch) {
    return urlMatch[1].toLowerCase();
  }
  
  // Tenta pelo MIME type
  const mimeMap = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg'
  };
  
  return mimeMap[mimeType] || 'jpg';
}

/**
 * ✅ NOVO: Verifica se URL é externa (não do Firebase)
 */
export function isUrlExterna(url) {
  if (!url) return false;
  return !url.includes('firebasestorage.googleapis.com') && 
         !url.includes('firebasestorage.app');
}

/**
 * ✅ NOVO: Processa URL da foto - baixa se for externa
 * @param {string} fotoUrl - URL da foto (pode ser externa ou do Firebase)
 * @param {string} userId - ID do usuário
 * @param {string} tipo - 'perfume' ou 'marca'
 * @param {string} nome - Nome do item
 * @returns {Promise<string>} URL final (Firebase)
 */
export async function processarFotoUrl(fotoUrl, userId, tipo, nome) {
  if (!fotoUrl || fotoUrl.trim() === '') {
    return null;
  }
  
  // Se já está no Firebase, retorna direto
  if (!isUrlExterna(fotoUrl)) {
    console.log('ℹ️ Imagem já está no Firebase');
    return fotoUrl;
  }
  
  // Se é externa, baixa e salva
  console.log('🌐 URL externa detectada, baixando...');
  try {
    const urlFirebase = await baixarESalvarImagem(fotoUrl, userId, tipo, nome);
    return urlFirebase;
  } catch (error) {
    console.error('⚠️ Erro ao processar imagem, usando URL original:', error);
    // Em caso de erro, usa a URL original mesmo
    return fotoUrl;
  }
}