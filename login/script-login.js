// login/script-login.js
import { auth } from '../adicionar-perfume/firebase-config.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log('✅ Script login carregado!');

// Aguarda o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM carregado!');

  // Botão criar conta
  const btnCriarConta = document.getElementById('btn-criar-conta');
  if (btnCriarConta) {
    btnCriarConta.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Navegando para criar conta...');
      window.location.href = '../criar-conta/criar-conta.html';
    });
  }

  // Modal de recuperação de senha
  const linkEsqueciSenha = document.getElementById('link-esqueci-senha');
  const modalRecuperar = document.getElementById('modal-recuperar-senha');
  const closeRecuperar = document.querySelector('.close-recuperar');
  const btnEnviarRecuperacao = document.getElementById('btn-enviar-recuperacao');

  if (linkEsqueciSenha && modalRecuperar) {
    linkEsqueciSenha.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Abrindo modal de recuperação...');
      modalRecuperar.style.display = 'flex';
    });
  }

  if (closeRecuperar && modalRecuperar) {
    closeRecuperar.addEventListener('click', () => {
      modalRecuperar.style.display = 'none';
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === modalRecuperar) {
      modalRecuperar.style.display = 'none';
    }
  });

  // Enviar email de recuperação
  if (btnEnviarRecuperacao) {
    btnEnviarRecuperacao.addEventListener('click', async () => {
      const emailRecuperacao = document.getElementById('email-recuperacao').value.trim();
      
      if (!emailRecuperacao) {
        alert('Por favor, digite seu email!');
        return;
      }
      
      btnEnviarRecuperacao.disabled = true;
      btnEnviarRecuperacao.textContent = 'Enviando...';
      
      try {
        await sendPasswordResetEmail(auth, emailRecuperacao);
        alert('Email de recuperação enviado! Verifique sua caixa de entrada.');
        modalRecuperar.style.display = 'none';
        document.getElementById('email-recuperacao').value = '';
      } catch (error) {
        console.error('Erro ao enviar email:', error);
        
        let mensagem = 'Erro ao enviar email. ';
        switch (error.code) {
          case 'auth/user-not-found':
            mensagem += 'Email não encontrado.';
            break;
          case 'auth/invalid-email':
            mensagem += 'Email inválido.';
            break;
          case 'auth/too-many-requests':
            mensagem += 'Muitas tentativas. Tente novamente mais tarde.';
            break;
          default:
            mensagem += error.message;
        }
        
        alert(mensagem);
      } finally {
        btnEnviarRecuperacao.disabled = false;
        btnEnviarRecuperacao.textContent = 'Enviar link';
      }
    });
  }

  // Login
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
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
  }
});