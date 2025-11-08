// login/script-login.js - Otimizado
import { auth } from '../adicionar-perfume/firebase-config.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { tratarErroFirebase, toggleLoading } from '../adicionar-perfume/utils.js';

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
  configurarModalRecuperacao();

  // Login
  configurarFormularioLogin();
});

/**
 * Configura modal de recuperação de senha
 */
function configurarModalRecuperacao() {
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
      document.getElementById('email-recuperacao').value = '';
    });
  }

  // Fechar ao clicar fora
  window.addEventListener('click', (e) => {
    if (e.target === modalRecuperar) {
      modalRecuperar.style.display = 'none';
      document.getElementById('email-recuperacao').value = '';
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
        alert('✅ Email de recuperação enviado! Verifique sua caixa de entrada.');
        modalRecuperar.style.display = 'none';
        document.getElementById('email-recuperacao').value = '';
      } catch (error) {
        console.error('Erro ao enviar email:', error);
        alert('❌ ' + tratarErroFirebase(error));
      } finally {
        btnEnviarRecuperacao.disabled = false;
        btnEnviarRecuperacao.textContent = 'Enviar link';
      }
    });
  }
}

/**
 * Configura formulário de login
 */
function configurarFormularioLogin() {
  const formLogin = document.getElementById('form-login');
  
  if (!formLogin) return;
  
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    // Validações básicas
    if (!email || !senha) {
      alert('Por favor, preencha todos os campos!');
      return;
    }

    const btnEntrar = document.querySelector('.btn-entrar');
    btnEntrar.disabled = true;
    btnEntrar.textContent = 'Entrando...';
    
    toggleLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      console.log('✅ Login realizado:', user.email);

      // Pequeno delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redireciona para a página de perfil
      window.location.href = '../perfil/perfil.html';

    } catch (error) {
      console.error('❌ Erro ao fazer login:', error);
      
      toggleLoading(false);
      
      alert('❌ ' + tratarErroFirebase(error));
      
      btnEntrar.disabled = false;
      btnEntrar.textContent = 'Entrar';
    }
  });
}