// script-login.js
import { auth } from '../firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Botão criar conta
const btnCriarConta = document.getElementById('btn-criar-conta');

if (btnCriarConta) {
  btnCriarConta.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Navegando para criar conta...');
    window.location.href = '../criar-conta/criar-conta.html';
  });
} else {
  console.error('Botão criar conta não encontrado!');
}

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

    console.log('Login realizado:', user.email);

    // Redireciona para a página de perfil
    window.location.href = '../perfil/perfil.html';

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
      case 'auth/invalid-credential':
        mensagem += 'Email ou senha incorretos.';
        break;
      default:
        mensagem += error.message;
    }

    alert(mensagem);
    btnEntrar.disabled = false;
    btnEntrar.textContent = 'Entrar';
  }
});