import { authService } from '../services/auth-service.js';
import { showToast } from '../components/toast.js';

export function renderLogin() {
  // Ocultar sidebar/navbar
  const sidebar = document.getElementById('sidebar');
  const navbar = document.getElementById('navbar');
  if (sidebar) sidebar.style.display = 'none';
  if (navbar) navbar.style.display = 'none';

  // Hacer que el content ocupe toda la pantalla
  const mainWrapper = document.querySelector('.main-wrapper');
  if (mainWrapper) {
    mainWrapper.style.marginLeft = '0';
    mainWrapper.style.paddingTop = '0';
  }

  const content = document.getElementById('content');
  content.style.padding = '0';
  content.style.maxWidth = '100%';
  content.style.paddingTop = '0';

  content.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg-base)">
      <div style="width:100%;max-width:400px;padding:var(--space-4)">
        <div style="text-align:center;margin-bottom:32px">
          <div style="font-size:48px;margin-bottom:8px">🧾</div>
          <h1 style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary)">FacturApp</h1>
          <p style="color:var(--text-muted);margin-top:4px">Gestión de facturas profesional</p>
        </div>

        <div class="card" style="padding:32px">
          <div id="login-form">
            <h2 style="font-size:var(--text-lg);font-weight:700;margin-bottom:20px">Iniciar Sesión</h2>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" id="login-email" class="form-input" placeholder="tu@email.com" />
            </div>
            <div class="form-group" style="margin-top:12px">
              <label class="form-label">Contraseña</label>
              <input type="password" id="login-password" class="form-input" placeholder="••••••••" />
            </div>
            <button id="login-btn" class="btn btn-primary" style="width:100%;margin-top:20px">
              Iniciar Sesión
            </button>
            <p style="text-align:center;margin-top:16px;font-size:var(--text-sm);color:var(--text-muted)">
              ¿No tienes cuenta?
              <a href="#" id="register-link" style="color:var(--primary-400);text-decoration:none;font-weight:600"> Crear cuenta</a>
            </p>
          </div>

          <div id="register-form" style="display:none">
            <h2 style="font-size:var(--text-lg);font-weight:700;margin-bottom:20px">Crear Cuenta</h2>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" id="register-email" class="form-input" placeholder="tu@email.com" />
            </div>
            <div class="form-group" style="margin-top:12px">
              <label class="form-label">Contraseña</label>
              <input type="password" id="register-password" class="form-input" placeholder="Mínimo 6 caracteres" />
            </div>
            <button id="register-btn" class="btn btn-primary" style="width:100%;margin-top:20px">
              Crear Cuenta
            </button>
            <p style="text-align:center;margin-top:16px;font-size:var(--text-sm);color:var(--text-muted)">
              ¿Ya tienes cuenta?
              <a href="#" id="login-link" style="color:var(--primary-400);text-decoration:none;font-weight:600"> Iniciar sesión</a>
            </p>
          </div>
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
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');

    if (!email || !password) {
      showToast('Completa todos los campos', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Entrando...';

    const result = await authService.login(email, password);
    if (result.success) {
      window.location.reload();
    } else {
      showToast('Error: ' + result.error, 'error');
      btn.disabled = false;
      btn.textContent = 'Iniciar Sesión';
    }
  });

  // Login con Enter
  document.getElementById('login-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
  });

  document.getElementById('register-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const btn = document.getElementById('register-btn');

    if (!email || !password) {
      showToast('Completa todos los campos', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creando cuenta...';

    const result = await authService.register(email, password);
    if (result.success) {
      showToast('Cuenta creada. Revisa tu email para confirmar.', 'success');
      btn.disabled = false;
      btn.textContent = 'Crear Cuenta';
    } else {
      showToast('Error: ' + result.error, 'error');
      btn.disabled = false;
      btn.textContent = 'Crear Cuenta';
    }
  });
}
