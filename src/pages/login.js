import { authService } from '../services/auth-service.js';
import { showToast } from '../components/toast.js';

export function renderLogin() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div style="max-width: 400px; margin: 100px auto;">
      <h1 style="text-align: center; margin-bottom: 30px;">FacturApp</h1>
      <div class="card" style="padding: 30px;">
        <div id="login-form">
          <h2 style="margin-bottom: 20px;">Iniciar Sesión</h2>
          <input type="email" id="login-email" placeholder="Email" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
          <input type="password" id="login-password" placeholder="Contraseña" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
          <button id="login-btn" class="btn btn-primary" style="width: 100%;">Iniciar Sesión</button>
          <p style="text-align: center; margin-top: 15px;">
            <a href="#" id="register-link" style="color: var(--primary-400); text-decoration: none;">Crear cuenta</a>
          </p>
        </div>
        <div id="register-form" style="display: none;">
          <h2 style="margin-bottom: 20px;">Crear Cuenta</h2>
          <input type="email" id="register-email" placeholder="Email" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
          <input type="password" id="register-password" placeholder="Contraseña" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
          <button id="register-btn" class="btn btn-primary" style="width: 100%;">Crear Cuenta</button>
          <p style="text-align: center; margin-top: 15px;">
            <a href="#" id="login-link" style="color: var(--primary-400); text-decoration: none;">Volver al login</a>
          </p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('register-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
  });

  document.getElementById('login-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
  });

  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showToast('Por favor completa todos los campos', 'error');
      return;
    }

    const result = await authService.login(email, password);
    if (result.success) {
      window.location.reload();
    } else {
      showToast('Error: ' + result.error, 'error');
    }
  });

  document.getElementById('register-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (!email || !password) {
      showToast('Por favor completa todos los campos', 'error');
      return;
    }

    const result = await authService.register(email, password);
    if (result.success) {
      showToast('Cuenta creada. Iniciando sesión...', 'success');
      window.location.reload();
    } else {
      showToast('Error: ' + result.error, 'error');
    }
  });
}
