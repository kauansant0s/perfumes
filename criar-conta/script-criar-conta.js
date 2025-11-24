// script-criar-conta.js - COMPLETO
import { getAuth, createUserWithEmailAndPassword, updateProfile, updateEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
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
const storage = getStorage(app);

// Verifica se está em modo de edição
const urlParams = new URLSearchParams(window.location.search);
const modoEdicao = urlParams.get('editar') === 'true';

console.log('Modo edição:', modoEdicao);

// Se está em modo de edição, carrega dados do usuário
// Se está em modo de edição, carrega dados do usuário
if (modoEdicao) {
  document.getElementById('titulo-pagina').textContent = 'Editar Perfil';
  document.getElementById('btn-submit').textContent = 'Salvar Alterações';
  
  // ✅ Email fica readonly (não pode trocar)
  const emailInput = document.getElementById('email');
  emailInput.setAttribute('readonly', true);
  
  // ✅ Mostra botão de trocar senha
  document.getElementById('campo-botao-senha').style.display = 'block';
  
  // ✅ Event listener do botão trocar senha
  document.getElementById('btn-trocar-senha').addEventListener('click', () => {
    const campoSenha = document.getElementById('campo-senha');
    const campoConfirmar = document.getElementById('campo-confirmar-senha');
    const btnTrocar = document.getElementById('btn-trocar-senha');
    
    if (campoSenha.style.display === 'none') {
      // Mostra campos de senha
      campoSenha.style.display = 'block';
      campoConfirmar.style.display = 'block';
      btnTrocar.textContent = '❌ Cancelar troca de senha';
      btnTrocar.style.borderColor = '#999';
      btnTrocar.style.color = '#999';
      
      // Torna campos obrigatórios
      document.getElementById('senha').setAttribute('required', 'required');
      document.getElementById('confirmar-senha').setAttribute('required', 'required');
    } else {
      // Esconde campos de senha
      campoSenha.style.display = 'none';
      campoConfirmar.style.display = 'none';
      btnTrocar.textContent = '🔒 Deseja trocar a senha?';
      btnTrocar.style.borderColor = '#C06060';
      btnTrocar.style.color = '#C06060';
      
      // Remove obrigatoriedade
      document.getElementById('senha').removeAttribute('required');
      document.getElementById('confirmar-senha').removeAttribute('required');
      
      // Limpa valores
      document.getElementById('senha').value = '';
      document.getElementById('confirmar-senha').value = '';
    }
  });
  
  // Aguarda autenticação e carrega dados
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('Carregando dados do usuário:', user.email);
      carregarDadosUsuario(user);
    } else {
      alert('Você precisa estar logado!');
      window.location.href = '../login/login.html';
    }
  });
} else {
  // Modo criar conta - verifica se está logado (não deveria estar)
  auth.onAuthStateChanged((user) => {
    if (user) {
      // Se já está logado, redireciona para perfil
      window.location.href = '../perfil/perfil.html';
    }
  });
}

// Carrega dados do usuário para edição
function carregarDadosUsuario(user) {
  document.getElementById('nome').value = user.displayName || '';
  document.getElementById('email').value = user.email || '';
  
  if (user.photoURL) {
    const preview = document.getElementById('preview-foto');
    const textoFoto = document.getElementById('texto-foto');
    preview.src = user.photoURL;
    preview.style.display = 'block';
    textoFoto.style.display = 'none';
  }
  
  console.log('✅ Dados do usuário carregados!');
}

// Preview da foto
const quadradoFoto = document.getElementById('quadrado-foto');
const fotoInput = document.getElementById('foto-perfil');
const previewFoto = document.getElementById('preview-foto');
const textoFoto = document.getElementById('texto-foto');

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

// Botão Cancelar
document.getElementById('btn-cancelar').addEventListener('click', () => {
  if (modoEdicao) {
    window.location.href = '../perfil/perfil.html';
  } else {
    window.location.href = '../login/login.html';
  }
});

// Criar conta OU Editar perfil
document.getElementById('form-criar-conta').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const btnSubmit = document.getElementById('btn-submit');
  const textoOriginal = btnSubmit.textContent;
  
  if (!nome) {
    alert('Por favor, preencha o nome!');
    return;
  }
  
  btnSubmit.disabled = true;
  btnSubmit.textContent = modoEdicao ? 'Salvando...' : 'Criando conta...';

  try {
    if (modoEdicao) {
      // ===== MODO EDIÇÃO =====
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      let photoURL = user.photoURL;
      
      // Faz upload da nova foto se houver
      if (fotoInput.files.length > 0) {
        const file = fotoInput.files[0];
        
        // Valida tamanho (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Imagem muito grande. Máximo 5MB');
        }
        
        const storageRef = ref(storage, `perfis/${user.uid}`);
        console.log('📤 Fazendo upload da foto...');
        await uploadBytes(storageRef, file);
        photoURL = await getDownloadURL(storageRef);
        console.log('✅ Foto enviada!');
      }
      
      // Atualiza a senha SE os campos estiverem preenchidos
      const senha = document.getElementById('senha').value;
      const confirmarSenha = document.getElementById('confirmar-senha').value;
      
      if (senha || confirmarSenha) {
        // Validações de senha
        if (senha !== confirmarSenha) {
          throw new Error('As senhas não coincidem!');
        }
        
        if (senha.length < 8) {
          throw new Error('A senha deve ter pelo menos 8 caracteres!');
        }
        
        const temNumero = /\d/.test(senha);
        const temEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);
        
        if (!temNumero) {
          throw new Error('A senha deve conter pelo menos 1 número!');
        }
        
        if (!temEspecial) {
          throw new Error('A senha deve conter pelo menos 1 caractere especial!');
        }
        
        // Atualiza senha
        const { updatePassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        await updatePassword(user, senha);
        console.log('✅ Senha atualizada!');
      }
      
      // Atualiza o perfil
      await updateProfile(user, {
        displayName: nome,
        photoURL: photoURL
      });
      
      console.log('✅ Perfil atualizado!');
      alert('✅ Perfil atualizado com sucesso!');
      window.location.href = '../perfil/perfil.html';
      
    } else {
      // ===== MODO CRIAR CONTA =====
      const email = document.getElementById('email').value.trim();
      const senha = document.getElementById('senha').value;
      const confirmarSenha = document.getElementById('confirmar-senha').value;
      
      // Validações
      if (!email || !senha) {
        alert('Por favor, preencha todos os campos!');
        btnSubmit.disabled = false;
        btnSubmit.textContent = textoOriginal;
        return;
      }
      
      if (senha !== confirmarSenha) {
        alert('As senhas não coincidem!');
        btnSubmit.disabled = false;
        btnSubmit.textContent = textoOriginal;
        return;
      }

      if (senha.length < 8) {
        alert('A senha deve ter pelo menos 8 caracteres!');
        btnSubmit.disabled = false;
        btnSubmit.textContent = textoOriginal;
        return;
      }

      const temNumero = /\d/.test(senha);
      const temEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);

      if (!temNumero) {
        alert('A senha deve conter pelo menos 1 número!');
        btnSubmit.disabled = false;
        btnSubmit.textContent = textoOriginal;
        return;
      }

      if (!temEspecial) {
        alert('A senha deve conter pelo menos 1 caractere especial (!@#$%^&*(),.?":{}|<>)');
        btnSubmit.disabled = false;
        btnSubmit.textContent = textoOriginal;
        return;
      }

      // Cria o usuário
      console.log('📝 Criando conta...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      let photoURL = null;

      // Faz upload da foto se existir
      if (fotoInput.files.length > 0) {
        const file = fotoInput.files[0];
        
        // Valida tamanho
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Imagem muito grande. Máximo 5MB');
        }
        
        const storageRef = ref(storage, `perfis/${user.uid}`);
        console.log('📤 Fazendo upload da foto...');
        await uploadBytes(storageRef, file);
        photoURL = await getDownloadURL(storageRef);
        console.log('✅ Foto enviada!');
      }

      // Atualiza o perfil com nome e foto
      await updateProfile(user, {
        displayName: nome,
        photoURL: photoURL
      });

      console.log('✅ Conta criada!');
      alert('✅ Conta criada com sucesso!');
      window.location.href = '../login/login.html';
    }

  } catch (error) {
    console.error('❌ Erro:', error);
    
    let mensagem = modoEdicao ? 'Erro ao atualizar perfil. ' : 'Erro ao criar conta. ';
    
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
      case 'storage/unauthorized':
        mensagem += 'Erro ao fazer upload da foto.';
        break;
      default:
        mensagem += error.message;
    }
    
    alert(mensagem);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = textoOriginal;
  }
});