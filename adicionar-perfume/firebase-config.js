// firebase-config.js - Otimizado
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, serverTimestamp, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { tratarErroFirebase } from './utils.js';

const firebaseConfig = {
  apiKey: "AIzaSyCWuG4gVnf6r2JVBJX4k6a5kwM_Jf3cw8c",
  authDomain: "meus-pefumes.firebaseapp.com",
  projectId: "meus-pefumes",
  storageBucket: "meus-pefumes.firebasestorage.app",
  messagingSenderId: "5138203233",
  appId: "1:5138203233:web:b684d4397c4ffefa572020"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Cache para marcas (evita múltiplas consultas)
let marcasCache = null;
let marcasCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Exporta instâncias
export { app, db, storage, auth };

// ===== FUNÇÕES PARA MANIPULAR MARCAS =====

/**
 * Busca todas as marcas (com cache)
 * @returns {Promise<Array<string>>}
 */
export async function buscarMarcas() {
  try {
    // Verifica se tem cache válido
    const agora = Date.now();
    if (marcasCache && marcasCacheTime && (agora - marcasCacheTime) < CACHE_DURATION) {
      console.log('✅ Marcas carregadas do cache');
      return marcasCache;
    }
    
    console.log('📡 Buscando marcas do Firestore...');
    const querySnapshot = await getDocs(collection(db, "marcas"));
    const marcas = [];
    querySnapshot.forEach((doc) => {
      marcas.push(doc.data().nome);
    });
    
    // Atualiza cache
    marcasCache = marcas.sort();
    marcasCacheTime = agora;
    
    return marcasCache;
  } catch (error) {
    console.error("Erro ao buscar marcas:", error);
    throw new Error(tratarErroFirebase(error));
  }
}

/**
 * Salva nova marca
 * @param {string} nomeMarca - Nome da marca
 */
export async function salvarMarca(nomeMarca) {
  try {
    if (!nomeMarca || nomeMarca.trim() === '') {
      throw new Error('Nome da marca não pode estar vazio');
    }
    
    const marcaNormalizada = nomeMarca.trim();
    
    // Verifica se já existe
    const q = query(
      collection(db, "marcas"),
      where("nome", "==", marcaNormalizada)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      await addDoc(collection(db, "marcas"), {
        nome: marcaNormalizada,
        dataCriacao: serverTimestamp()
      });
      console.log("✅ Nova marca salva:", marcaNormalizada);
      
      // Invalida cache
      marcasCache = null;
      marcasCacheTime = null;
    }
  } catch (error) {
    console.error("Erro ao salvar marca:", error);
    throw new Error(tratarErroFirebase(error));
  }
}

// ===== FUNÇÕES PARA MANIPULAR PERFUMES =====

/**
 * Valida dados do perfume
 * @param {Object} perfumeData - Dados do perfume
 * @returns {Array<string>} Array de erros
 */
function validarPerfume(perfumeData) {
  const erros = [];
  
  if (!perfumeData.nome?.trim()) {
    erros.push('Nome do perfume é obrigatório');
  }
  
  if (!perfumeData.marca?.trim()) {
    erros.push('Marca é obrigatória');
  }
  
  // Status NÃO é mais obrigatório - pode ser vazio/indefinido
  // O perfume pode existir sem status específico
  
  // Valida avaliações se o status for "tenho" ou "ja-tive"
  if ((perfumeData.status === 'tenho' || perfumeData.status === 'ja-tive') && perfumeData.avaliacoes) {
    const { cheiro, projecao, fixacao, versatilidade } = perfumeData.avaliacoes;
    if (cheiro === 0 || projecao === 0 || fixacao === 0 || versatilidade === 0) {
      erros.push('Preencha todas as avaliações (cheiro, projeção, fixação e versatilidade)');
    }
  }
  
  return erros;
}

/**
 * Salva perfume
 * @param {Object} perfumeData - Dados do perfume
 * @param {string} userId - ID do usuário
 * @returns {Promise<string>} ID do documento criado
 */
export async function salvarPerfume(perfumeData, userId) {
  try {
    // Valida dados
    const erros = validarPerfume(perfumeData);
    if (erros.length > 0) {
      throw new Error(erros.join('\n'));
    }
    
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    
    const docRef = await addDoc(collection(db, "perfumes"), {
      ...perfumeData,
      userId: userId,
      dataCriacao: serverTimestamp()
    });
    
    console.log("✅ Perfume salvo com ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao salvar perfume:", error);
    throw new Error(tratarErroFirebase(error));
  }
}

/**
 * Busca perfumes do usuário (com cache opcional)
 * @param {string} userId - ID do usuário
 * @param {boolean} useCache - Se deve usar cache
 * @returns {Promise<Array>}
 */
let perfumesCache = {};
export async function buscarPerfumes(userId, useCache = false) {
  try {
    if (!userId) {
      throw new Error('ID do usuário não fornecido');
    }
    
    // Verifica cache
    if (useCache && perfumesCache[userId]) {
      console.log('✅ Perfumes carregados do cache');
      return perfumesCache[userId];
    }
    
    console.log('📡 Buscando perfumes do Firestore...');
    const q = query(
      collection(db, "perfumes"),
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    const perfumes = [];
    
    querySnapshot.forEach((doc) => {
      perfumes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Atualiza cache
    perfumesCache[userId] = perfumes;
    
    console.log(`✅ ${perfumes.length} perfumes encontrados`);
    return perfumes;
  } catch (error) {
    console.error("Erro ao buscar perfumes:", error);
    throw new Error(tratarErroFirebase(error));
  }
}

/**
 * Busca um perfume específico por ID
 * @param {string} perfumeId - ID do perfume
 * @returns {Promise<Object|null>}
 */
export async function buscarPerfumePorId(perfumeId) {
  try {
    if (!perfumeId) {
      throw new Error('ID do perfume não fornecido');
    }
    
    const perfumeRef = doc(db, "perfumes", perfumeId);
    const perfumeSnap = await getDoc(perfumeRef);
    
    if (perfumeSnap.exists()) {
      return {
        id: perfumeSnap.id,
        ...perfumeSnap.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao buscar perfume:", error);
    throw new Error(tratarErroFirebase(error));
  }
}

/**
 * Invalida cache de perfumes
 * @param {string} userId - ID do usuário
 */
export function invalidarCachePerfumes(userId) {
  if (userId && perfumesCache[userId]) {
    delete perfumesCache[userId];
    console.log('🗑️ Cache de perfumes invalidado');
  }
}

/**
 * Atualiza perfume
 * @param {string} id - ID do perfume
 * @param {Object} perfumeData - Dados atualizados
 * @param {string} userId - ID do usuário
 */
export async function atualizarPerfume(id, perfumeData, userId) {
  try {
    // Valida dados
    const erros = validarPerfume(perfumeData);
    if (erros.length > 0) {
      throw new Error(erros.join('\n'));
    }
    
    const perfumeRef = doc(db, "perfumes", id);
    
    // Verifica se o perfume existe e pertence ao usuário
    const perfumeSnap = await getDoc(perfumeRef);
    if (!perfumeSnap.exists()) {
      throw new Error('Perfume não encontrado');
    }
    
    if (perfumeSnap.data().userId !== userId) {
      throw new Error('Você não tem permissão para editar este perfume');
    }
    
    await updateDoc(perfumeRef, {
      ...perfumeData,
      dataAtualizacao: serverTimestamp()
    });
    
    // Invalida cache
    invalidarCachePerfumes(userId);
    
    console.log("✅ Perfume atualizado!");
  } catch (error) {
    console.error("Erro ao atualizar perfume:", error);
    throw new Error(tratarErroFirebase(error));
  }
}

/**
 * Deleta perfume
 * @param {string} id - ID do perfume
 * @param {string} userId - ID do usuário
 */
export async function deletarPerfume(id, userId) {
  try {
    const perfumeRef = doc(db, "perfumes", id);
    
    // Verifica se pertence ao usuário
    const perfumeSnap = await getDoc(perfumeRef);
    if (!perfumeSnap.exists()) {
      throw new Error('Perfume não encontrado');
    }
    
    if (perfumeSnap.data().userId !== userId) {
      throw new Error('Você não tem permissão para deletar este perfume');
    }
    
    await deleteDoc(perfumeRef);
    
    // Invalida cache
    invalidarCachePerfumes(userId);
    
    console.log("✅ Perfume deletado!");
  } catch (error) {
    console.error("Erro ao deletar perfume:", error);
    throw new Error(tratarErroFirebase(error));
  }
}

/**
 * Upload de foto do perfume
 * @param {File} file - Arquivo da foto
 * @param {string} userId - ID do usuário
 * @returns {Promise<string>} URL da foto
 */
export async function uploadFotoPerfume(file, userId) {
  try {
    if (!file) {
      throw new Error('Nenhum arquivo selecionado');
    }
    
    // Valida tipo de arquivo
    if (!file.type.startsWith('image/')) {
      throw new Error('Arquivo deve ser uma imagem');
    }
    
    // Valida tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Imagem muito grande. Máximo 5MB');
    }
    
    const timestamp = Date.now();
    const storageRef = ref(storage, `perfumes/${userId}/${timestamp}_${file.name}`);
    
    console.log('📤 Fazendo upload da foto...');
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    console.log('✅ Foto enviada com sucesso!');
    return url;
  } catch (error) {
    console.error("Erro ao fazer upload da foto:", error);
    throw new Error(tratarErroFirebase(error));
  }
}

// ===== FUNÇÕES PARA PREFERÊNCIAS DO USUÁRIO =====

/**
 * Salva preferências do usuário
 * @param {string} userId - ID do usuário
 * @param {Object} preferencias - Preferências a salvar
 */
export async function salvarPreferenciasUsuario(userId, preferencias) {
  try {
    if (!userId) {
      throw new Error('ID do usuário não fornecido');
    }
    
    const preferencesRef = doc(db, "userPreferences", userId);
    
    try {
      await updateDoc(preferencesRef, {
        ...preferencias,
        dataAtualizacao: serverTimestamp()
      });
      console.log("✅ Preferências atualizadas!");
    } catch (error) {
      if (error.code === 'not-found') {
        await setDoc(preferencesRef, {
          userId: userId,
          ...preferencias,
          dataCriacao: serverTimestamp(),
          dataAtualizacao: serverTimestamp()
        });
        console.log("✅ Preferências criadas!");
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Erro ao salvar preferências:", error);
    throw new Error(tratarErroFirebase(error));
  }
}

/**
 * Busca preferências do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object|null>}
 */
export async function buscarPreferenciasUsuario(userId) {
  try {
    if (!userId) {
      throw new Error('ID do usuário não fornecido');
    }
    
    const preferencesRef = doc(db, "userPreferences", userId);
    const docSnap = await getDoc(preferencesRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao buscar preferências:", error);
    throw new Error(tratarErroFirebase(error));
  }
}