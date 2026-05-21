// ============================================
// Automalize - SPA Router
// ============================================

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  /**
   * Register a route handler
   */
  on(route, handler) {
    this.routes[route] = handler;
    return this;
  }

  /**
   * Navigate to a route
   */
  navigate(route, params = {}) {
    let hash = `#/${route}`;
    const queryParams = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    if (queryParams) hash += `?${queryParams}`;
    window.location.hash = hash;
  }

  /**
   * Get query params from hash
   */
  getParams() {
    const hash = window.location.hash;
    const queryIdx = hash.indexOf('?');
    if (queryIdx === -1) return {};
    const queryStr = hash.substring(queryIdx + 1);
    const params = {};
    queryStr.split('&').forEach((pair) => {
      const [key, value] = pair.split('=');
      params[key] = decodeURIComponent(value || '');
    });
    return params;
  }

  /**
   * Get current route name
   */
  getCurrentRoute() {
    const hash = window.location.hash.replace('#/', '');
    const route = hash.split('?')[0];
    return route || 'dashboard';
  }

  /**
   * Handle route change
   */
  async handleRoute() {
    const route = this.getCurrentRoute();
    this.currentRoute = route;
    const handler = this.routes[route] || this.routes['dashboard'];
    if (handler) {
      await handler(this.getParams());
    }
    // Update active sidebar link
    document.querySelectorAll('.sidebar-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.route === route);
    });
  }

  /**
   * Start the router
   */
  start() {
    this.handleRoute();
  }
}

export const router = new Router();
