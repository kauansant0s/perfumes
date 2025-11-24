// admin-config.js - Configuração centralizada do admin
/**
 * ✅ IMPORTANTE: Este arquivo centraliza a verificação de admin
 * Para alterar o email admin, mude APENAS aqui
 */

let adminEmail = null;
let isAdminUser = false;

/**
 * Verifica se usuário é admin
 * @param {Object} user - Usuário do Firebase Auth
 * @returns {Promise<boolean>}
 */
export async function verificarAdmin(user) {
  if (!user) {
    isAdminUser = false;
    return false;
  }
  
  // Salva email para comparações rápidas
  adminEmail = user.email;
  
  try {
    // 1. Verifica Custom Claims (método preferido)
    const idTokenResult = await user.getIdTokenResult();
    if (idTokenResult.claims.admin === true) {
      console.log('✅ Usuário é admin (via Custom Claims)');
      isAdminUser = true;
      return true;
    }
    
    // 2. Fallback: verifica email (TEMPORÁRIO - até configurar Custom Claims)
    const EMAIL_ADMIN = 'kauankssantos.12@gmail.com'; // ⚠️ ÚNICO lugar com email hardcoded
    if (user.email === EMAIL_ADMIN) {
      console.log('✅ Usuário é admin (via email)');
      isAdminUser = true;
      return true;
    }
    
    isAdminUser = false;
    return false;
    
  } catch (error) {
    console.error('❌ Erro ao verificar admin:', error);
    isAdminUser = false;
    return false;
  }
}

/**
 * Retorna se usuário atual é admin (sync)
 */
export function isAdmin() {
  return isAdminUser;
}

/**
 * Retorna email do admin atual
 */
export function getAdminEmail() {
  return adminEmail;
}