// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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

// Funções para manipular perfumes
export async function salvarPerfume(perfumeData) {
  try {
    const docRef = await addDoc(collection(db, "perfumes"), perfumeData);
    console.log("Perfume salvo com ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao salvar perfume:", error);
    throw error;
  }
}

export async function buscarPerfumes() {
  try {
    const querySnapshot = await getDocs(collection(db, "perfumes"));
    const perfumes = [];
    querySnapshot.forEach((doc) => {
      perfumes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return perfumes;
  } catch (error) {
    console.error("Erro ao buscar perfumes:", error);
    throw error;
  }
}

export async function atualizarPerfume(id, perfumeData) {
  try {
    const perfumeRef = doc(db, "perfumes", id);
    await updateDoc(perfumeRef, perfumeData);
    console.log("Perfume atualizado!");
  } catch (error) {
    console.error("Erro ao atualizar perfume:", error);
    throw error;
  }
}

export async function deletarPerfume(id) {
  try {
    await deleteDoc(doc(db, "perfumes", id));
    console.log("Perfume deletado!");
  } catch (error) {
    console.error("Erro ao deletar perfume:", error);
    throw error;
  }
}

export async function uploadFotoPerfume(file) {
  try {
    const timestamp = Date.now();
    const storageRef = ref(storage, `perfumes/${timestamp}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error("Erro ao fazer upload da foto:", error);
    throw error;
  }
}