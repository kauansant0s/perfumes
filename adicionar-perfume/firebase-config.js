// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// Funções para manipular perfumes (AGORA COM USERID)
export async function salvarPerfume(perfumeData, userId) {
  try {
    const docRef = await addDoc(collection(db, "perfumes"), {
      ...perfumeData,
      userId: userId, // Adiciona o ID do usuário
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
    // Busca apenas perfumes do usuário logado
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
    const perfumeRef = doc(db, "perfumes", id);
    
    // Verifica se o perfume pertence ao usuário (segurança extra)
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
    // Em produção, você deve verificar se o perfume pertence ao usuário
    // antes de deletar (usando uma consulta primeiro)
    await deleteDoc(doc(db, "perfumes", id));
    console.log("Perfume deletado!");
  } catch (error) {
    console.error("Erro ao deletar perfume:", error);
    throw error;
  }
}

export async function uploadFotoPerfume(file, userId) {
  try {
    const timestamp = Date.now();
    // Organiza fotos por usuário
    const storageRef = ref(storage, `perfumes/${userId}/${timestamp}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error("Erro ao fazer upload da foto:", error);
    throw error;
  }
}

// Funções para preferências do usuário (Top 5 e Assinatura)
export async function salvarPreferenciasUsuario(userId, preferencias) {
  try {
    const preferencesRef = doc(db, "userPreferences", userId);
    
    // Tenta atualizar primeiro
    try {
      await updateDoc(preferencesRef, {
        ...preferencias,
        dataAtualizacao: serverTimestamp()
      });
      console.log("Preferências atualizadas!");
    } catch (error) {
      // Se não existe, cria o documento com setDoc
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
    const q = query(
      collection(db, "userPreferences"),
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao buscar preferências:", error);
    return null;
  }
}