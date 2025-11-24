// script-criar-conta.js - COMPLETO
import { getAuth, createUserWithEmailAndPassword, updateProfile, updateEmail, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getFirestore, collection, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { customAlert, customConfirm, showToast } from '../adicionar-perfume/custom-dialogs.js';

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
if (modoEdicao) {
  document.getElementById('titulo-pagina').textContent = 'Editar Perfil';
  document.getElementById('btn-submit').textContent = 'Salvar Alterações';

  // ✅ Mostra botão deletar conta
  const btnDeletarConta = document.getElementById('btn-deletar-conta');
  if (btnDeletarConta) {
    btnDeletarConta.style.display = 'flex';
  }

  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('Carregando dados do usuário:', user.email);
      carregarDadosUsuario(user);
    } else {
      customAlert('Você precisa estar logado!', '⚠️ Erro').then(() => {
        window.location.href = '../login/login.html';
      });
    }
  });
  
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
    await customAlert('Por favor, preencha o nome!', '⚠️ Campo Obrigatório');
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
    
    await customAlert(mensagem, '❌ Erro');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = textoOriginal;
  }
});

/**
 * ✅ NOVA FUNÇÃO: Deletar conta do usuário
 */
async function deletarConta() {
  const user = auth.currentUser;
  
  if (!user) {
    await customAlert('Você precisa estar logado!', '⚠️ Erro');
    return;
  }
  
  // Confirmação 1
  const confirma1 = await customConfirm(
    `⚠️ ATENÇÃO! Esta ação é IRREVERSÍVEL!\n\nVocê está prestes a deletar sua conta permanentemente.\n\nTodos os seus perfumes cadastrados serão perdidos.\n\nTem certeza que deseja continuar?`,
    '🗑️ Deletar Conta'
  );
  
  if (!confirma1) {
    console.log('Deleção cancelada pelo usuário');
    return;
  }
  
  // Confirmação 2 - Pede senha para reautenticação
  const senhaModal = document.createElement('div');
  senhaModal.className = 'custom-modal show';
  senhaModal.innerHTML = `
    <div class="custom-modal-overlay"></div>
    <div class="custom-modal-content">
      <h3>🔐 Confirme sua Senha</h3>
      <p>Por segurança, precisamos que você confirme sua senha para deletar a conta.</p>
      <input type="password" id="senha-confirmar" class="campo-texto" placeholder="Digite sua senha" style="width: 100%; margin-bottom: 20px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 15px; box-sizing: border-box;">
      <div class="custom-modal-buttons">
        <button class="btn-modal-cancelar" id="btn-cancel-senha">Cancelar</button>
        <button class="btn-modal-confirmar" id="btn-confirm-senha">Confirmar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(senhaModal);
  
  const inputSenha = document.getElementById('senha-confirmar');
  inputSenha.focus();
  
  const resultado = await new Promise((resolve) => {
    document.getElementById('btn-cancel-senha').onclick = () => {
      senhaModal.remove();
      resolve(null);
    };
    
    document.getElementById('btn-confirm-senha').onclick = () => {
      const senha = inputSenha.value;
      senhaModal.remove();
      resolve(senha);
    };
    
    senhaModal.querySelector('.custom-modal-overlay').onclick = () => {
      senhaModal.remove();
      resolve(null);
    };
    
    inputSenha.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const senha = inputSenha.value;
        senhaModal.remove();
        resolve(senha);
      }
    });
  });
  
  if (!resultado) {
    console.log('Deleção cancelada - senha não fornecida');
    return;
  }
  
  const btnDeletar = document.getElementById('btn-deletar-conta');
  const textoOriginal = btnDeletar.textContent;
  btnDeletar.disabled = true;
  btnDeletar.innerHTML = '<span>Deletando...</span>';
  
  try {
    console.log('🔄 Iniciando processo de deleção...');
    
    // 1. Reautentica usuário
    const credential = EmailAuthProvider.credential(user.email, resultado);
    await reauthenticateWithCredential(user, credential);
    console.log('✅ Reautenticação bem-sucedida');
    
    // 2. Deleta todos os perfumes do usuário
    const db = getFirestore();
    const perfumesRef = collection(db, 'perfumes');
    const q = query(perfumesRef, where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    
    console.log(`📝 Deletando ${querySnapshot.size} perfumes...`);
    
    for (const docSnap of querySnapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
    
    // 3. Deleta preferências do usuário
    const prefsRef = collection(db, 'userPreferences');
    const qPrefs = query(prefsRef, where('userId', '==', user.uid));
    const prefsSnapshot = await getDocs(qPrefs);
    
    for (const docSnap of prefsSnapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
    
    console.log('✅ Dados do usuário deletados');
    
    // 4. Tenta deletar foto de perfil do Storage (se existir)
    if (user.photoURL && user.photoURL.includes('firebasestorage')) {
      try {
        const storage = getStorage();
        const photoRef = ref(storage, `perfis/${user.uid}`);
        await deleteObject(photoRef);
        console.log('✅ Foto de perfil deletada');
      } catch (error) {
        console.log('ℹ️ Foto de perfil não encontrada ou já deletada');
      }
    }
    
    // 5. Deleta a conta do usuário
    await deleteUser(user);
    
    console.log('✅ Conta deletada com sucesso!');
    
    await customAlert('Sua conta foi deletada com sucesso.\n\nEsperamos te ver novamente!', '✅ Conta Deletada');
    
    // Redireciona para página de login
    window.location.href = '../login/login.html';
    
  } catch (error) {
    console.error('❌ Erro ao deletar conta:', error);
    
    let mensagem = 'Erro ao deletar conta: ';
    
    if (error.code === 'auth/wrong-password') {
      mensagem += 'Senha incorreta.';
    } else if (error.code === 'auth/too-many-requests') {
      mensagem += 'Muitas tentativas. Tente novamente mais tarde.';
    } else {
      mensagem += error.message;
    }
    
    await customAlert(mensagem, '❌ Erro');
    
    btnDeletar.disabled = false;
    btnDeletar.textContent = textoOriginal;
  }
}

// Event listener do botão deletar conta
const btnDeletarConta = document.getElementById('btn-deletar-conta');
if (btnDeletarConta) {
  btnDeletarConta.addEventListener('click', deletarConta);
}