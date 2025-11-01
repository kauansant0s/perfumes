// script-criar-conta.js
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// Configuração do Firebase (mesma do firebase-config.js)
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
const storage = getStorage(app);

// Preview da foto
const quadradoFoto = document.getElementById('quadrado-foto');
const fotoInput = document.getElementById('foto-perfil');
const previewFoto = document.getElementById('preview-foto');
const textoFoto = document.getElementById('texto-foto');

// Clica direto no input ao clicar no quadrado
quadradoFoto.addEventListener('click', () => {
  fotoInput.click();
});

fotoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      previewFoto.src = event.target.result;
      previewFoto.style.display = 'block';
      textoFoto.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
});

// Criar conta
document.getElementById('form-criar-conta').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  const confirmarSenha = document.getElementById('confirmar-senha').value;

  // Validações
  if (senha !== confirmarSenha) {
    alert('As senhas não coincidem!');
    return;
  }

  // Validação de senha: mínimo 8 caracteres, 1 número e 1 caractere especial
  if (senha.length < 8) {
    alert('A senha deve ter pelo menos 8 caracteres!');
    return;
  }

  const temNumero = /\d/.test(senha);
  const temEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);

  if (!temNumero) {
    alert('A senha deve conter pelo menos 1 número!');
    return;
  }

  if (!temEspecial) {
    alert('A senha deve conter pelo menos 1 caractere especial (!@#$%^&*(),.?":{}|<>)');
    return;
  }

  const btnCriar = document.querySelector('.btn-criar');
  btnCriar.disabled = true;
  btnCriar.textContent = 'Criando conta...';

  try {
    // Cria o usuário no Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    let photoURL = null;

    // Faz upload da foto se existir
    if (fotoInput.files.length > 0) {
      const file = fotoInput.files[0];
      const storageRef = ref(storage, `perfis/${user.uid}`);
      await uploadBytes(storageRef, file);
      photoURL = await getDownloadURL(storageRef);
    }

    // Atualiza o perfil com nome e foto
    await updateProfile(user, {
      displayName: nome,
      photoURL: photoURL
    });

    alert('Conta criada com sucesso!');
    
    // Redireciona para a página de login
    window.location.href = '../login/login.html';

  } catch (error) {
    console.error('Erro ao criar conta:', error);
    
    // Mensagens de erro mais amigáveis
    let mensagem = 'Erro ao criar conta. ';
    switch (error.code) {
      case 'auth/email-already-in-use':
        mensagem += 'Este email já está em uso.';
        break;
      case 'auth/invalid-email':
        mensagem += 'Email inválido.';
        break;
      case 'auth/weak-password':
        mensagem += 'Senha muito fraca.';
        break;
      default:
        mensagem += error.message;
    }
    
    alert(mensagem);
    btnCriar.disabled = false;
    btnCriar.textContent = 'Criar conta';
  }
});