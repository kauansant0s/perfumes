// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, serverTimestamp, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// Exporta instâncias
export { app, db, storage, auth };

// Funções para manipular marcas
export async function buscarMarcas() {
  try {
    const querySnapshot = await getDocs(collection(db, "marcas"));
    const marcas = [];
    querySnapshot.forEach((doc) => {
      marcas.push(doc.data().nome);
    });
    return marcas.sort();
  } catch (error) {
    console.error("Erro ao buscar marcas:", error);
    throw error;
  }
}

export async function salvarMarca(nomeMarca) {
  try {
    if (!nomeMarca || nomeMarca.trim() === '') {
      throw new Error('Nome da marca não pode estar vazio');
    }
    
    const q = query(
      collection(db, "marcas"),
      where("nome", "==", nomeMarca)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      await addDoc(collection(db, "marcas"), {
        nome: nomeMarca,
        dataCriacao: serverTimestamp()
      });
      console.log("Nova marca salva:", nomeMarca);
    }
  } catch (error) {
    console.error("Erro ao salvar marca:", error);
    throw error;
  }
}

// Validação de perfume
function validarPerfume(perfumeData) {
  const erros = [];
  
  if (!perfumeData.nome?.trim()) {
    erros.push('Nome do perfume é obrigatório');
  }
  
  if (!perfumeData.marca?.trim()) {
    erros.push('Marca é obrigatória');
  }
  
  if (!perfumeData.status) {
    erros.push('Selecione o status (Tenho/Já tive/Quero ter)');
  }
  
  // Valida avaliações se o status for "tenho" ou "ja-tive"
  if ((perfumeData.status === 'tenho' || perfumeData.status === 'ja-tive') && perfumeData.avaliacoes) {
    const { cheiro, projecao, fixacao, versatilidade } = perfumeData.avaliacoes;
    if (cheiro === 0 || projecao === 0 || fixacao === 0 || versatilidade === 0) {
      erros.push('Preencha todas as avaliações (cheiro, projeção, fixação e versatilidade)');
    }
  }
  
  return erros;
}

// Funções para manipular perfumes
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
    
    console.log("Perfume salvo com ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao salvar perfume:", error);
    throw error;
  }
}

export async function buscarPerfumes(userId) {
  try {
    if (!userId) {
      throw new Error('ID do usuário não fornecido');
    }
    
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
    
    console.log(`Perfumes encontrados para usuário ${userId}:`, perfumes.length);
    return perfumes;
  } catch (error) {
    console.error("Erro ao buscar perfumes:", error);
    throw error;
  }
}

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
    
    console.log("Perfume atualizado!");
  } catch (error) {
    console.error("Erro ao atualizar perfume:", error);
    throw error;
  }
}

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
    console.log("Perfume deletado!");
  } catch (error) {
    console.error("Erro ao deletar perfume:", error);
    throw error;
  }
}

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
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error("Erro ao fazer upload da foto:", error);
    throw error;
  }
}

// Funções para preferências do usuário
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
      console.log("Preferências atualizadas!");
    } catch (error) {
      if (error.code === 'not-found') {
        await setDoc(preferencesRef, {
          userId: userId,
          ...preferencias,
          dataCriacao: serverTimestamp(),
          dataAtualizacao: serverTimestamp()
        });
        console.log("Preferências criadas!");
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Erro ao salvar preferências:", error);
    throw error;
  }
}

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
    throw error;
  }
}