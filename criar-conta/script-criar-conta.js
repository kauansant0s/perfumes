// script-criar-conta.js - COMPLETO
import { getAuth, createUserWithEmailAndPassword, updateProfile, updateEmail, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getFirestore, collection, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
if (modoEdicao) {
  document.getElementById('titulo-pagina').textContent = 'Editar Perfil';
  document.getElementById('btn-submit').textContent = 'Salvar Alterações';

  // ✅ Mostra botão deletar conta
  const btnDeletarConta = document.getElementById('btn-deletar-conta');
  if (btnDeletarConta) {
    btnDeletarConta.style.display = 'flex';
  }
  
  // ✅ Mostra botão de trocar senha
  const campoBotaoSenha = document.getElementById('campo-botao-senha');
  if (campoBotaoSenha) {
    campoBotaoSenha.style.display = 'block';
  }
  
  // ✅ Event listener do botão trocar senha
  const btnTrocarSenha = document.getElementById('btn-trocar-senha');
  if (btnTrocarSenha) {
    btnTrocarSenha.addEventListener('click', () => {
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
  }

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
  // Modo criar conta - mostra campos de senha e torna obrigatórios
  document.getElementById('campo-senha').style.display = 'block';
  document.getElementById('campo-confirmar-senha').style.display = 'block';
  document.getElementById('senha').setAttribute('required', 'required');
  document.getElementById('confirmar-senha').setAttribute('required', 'required');

  // Verifica se está logado (não deveria estar)
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
    avatarSelecionado = user.photoURL;
    const preview = document.getElementById('preview-avatar');
    if (preview) preview.src = user.photoURL;
    
    // Marca o avatar correspondente como selecionado (se for um dos pré-definidos)
    const grade = document.getElementById('avatar-grade');
    if (grade) {
      grade.querySelectorAll('.avatar-opcao').forEach((el, index) => {
        el.classList.toggle('selecionado', AVATARES[index] === user.photoURL);
      });
    }
  }
  
  console.log('✅ Dados do usuário carregados!');
}

// ===== SISTEMA DE AVATARES =====
const AVATARES = [
  // Adventurer (pessoas ilustradas)
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Lara&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Max&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Nina&backgroundColor=d1f4d0',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Tom&backgroundColor=ffe4c4',
  // Notionists (estilo notion)
  'https://api.dicebear.com/7.x/notionists/svg?seed=Rose&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Mila&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Jake&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Sara&backgroundColor=d1f4d0',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Leo&backgroundColor=ffe4c4',
  // Bottts (robôs fofos)
  'https://api.dicebear.com/7.x/bottts/svg?seed=Bolt&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Pixel&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Nova&backgroundColor=d1f4d0',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Spark&backgroundColor=ffe4c4',
  // Lorelei (retratos elegantes)
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Alice&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Bruno&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Clara&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Diego&backgroundColor=d1f4d0',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Eva&backgroundColor=ffe4c4',
];

let avatarSelecionado = AVATARES[0];

function renderizarAvatares() {
  const grade = document.getElementById('avatar-grade');
  const preview = document.getElementById('preview-avatar');
  
  // Define avatar inicial
  preview.src = avatarSelecionado;
  
  AVATARES.forEach((url, index) => {
    const div = document.createElement('div');
    div.className = 'avatar-opcao' + (index === 0 ? ' selecionado' : '');
    div.innerHTML = `<img src="${url}" alt="Avatar ${index + 1}" loading="lazy">`;
    div.addEventListener('click', () => {
      // Remove seleção anterior
      grade.querySelectorAll('.avatar-opcao').forEach(el => el.classList.remove('selecionado'));
      // Seleciona novo
      div.classList.add('selecionado');
      avatarSelecionado = url;
      preview.src = url;
    });
    grade.appendChild(div);
  });
}

renderizarAvatares();

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
      
      let photoURL = avatarSelecionado || user.photoURL;
      
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

      let photoURL = avatarSelecionado || AVATARES[0];

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

/**
 * ✅ NOVA FUNÇÃO: Deletar conta do usuário
 */
async function deletarConta() {
  const user = auth.currentUser;
  
  if (!user) {
    alert('Você precisa estar logado!');
    return;
  }
  
  // Confirmação 1
  const confirma1 = confirm('⚠️ ATENÇÃO! Esta ação é IRREVERSÍVEL!\n\nVocê está prestes a deletar sua conta permanentemente.\n\nTodos os seus perfumes cadastrados serão perdidos.\n\nTem certeza que deseja continuar?');
  
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
    
    alert('Sua conta foi deletada com sucesso.\n\nEsperamos te ver novamente!');
    
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
    
    alert(mensagem);
    
    btnDeletar.disabled = false;
    btnDeletar.textContent = textoOriginal;
  }
}

// Event listener do botão deletar conta
const btnDeletarConta = document.getElementById('btn-deletar-conta');
if (btnDeletarConta) {
  btnDeletarConta.addEventListener('click', deletarConta);
}