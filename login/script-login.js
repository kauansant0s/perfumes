// script-login.js
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// Configuração do Firebase
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

// Botão criar conta
document.getElementById('btn-criar-conta').addEventListener('click', () => {
  window.location.href = '..\\criar-conta\\criar-conta.html';
});

// Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;

  const btnEntrar = document.querySelector('.btn-entrar');
  btnEntrar.disabled = true;
  btnEntrar.textContent = 'Entrando...';

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    console.log('Login realizado:', user);
    alert('Login realizado com sucesso!');

    // Redireciona para a página principal (ajuste conforme necessário)
    window.location.href = 'index.html';

  } catch (error) {
    console.error('Erro ao fazer login:', error);

    // Mensagens de erro mais amigáveis
    let mensagem = 'Erro ao fazer login. ';
    switch (error.code) {
      case 'auth/user-not-found':
        mensagem += 'Usuário não encontrado.';
        break;
      case 'auth/wrong-password':
        mensagem += 'Senha incorreta.';
        break;
      case 'auth/invalid-email':
        mensagem += 'Email inválido.';
        break;
      case 'auth/user-disabled':
        mensagem += 'Esta conta foi desativada.';
        break;
      case 'auth/too-many-requests':
        mensagem += 'Muitas tentativas. Tente novamente mais tarde.';
        break;
      default:
        mensagem += error.message;
    }

    alert(mensagem);
    btnEntrar.disabled = false;
    btnEntrar.textContent = 'Entrar';
  }
});