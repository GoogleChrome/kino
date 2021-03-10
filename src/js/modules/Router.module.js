const globalClickHandler = (navigate) => (e) => {
  const target = e.path[0];
  if (e.ctrlKey || e.metaKey) return;
  if (target.href) {
    e.preventDefault();
    navigate(target.href);
  }
};

export default class Router {
  /**
   *
   * @param {object} context Any initial context to be passed to pages.
   */
  constructor(context = {}) {
    this.routes = [];
    this.context = context;

    window.addEventListener('popstate', () => this.run());

    document.querySelector('.mobile-button').addEventListener('click', () => {
      document.querySelector('body').classList.toggle('mobile');
    });

    // Global click listener setup
    const navigate = this.navigate.bind(this);
    document.addEventListener('click', globalClickHandler(navigate));

    this.init();
  }

  route(path, callback) {
    this.routes.push({ path, callback });
  }

  async init() {
    const response = await fetch('/api.json');
    const apiData = await response.json();

    this.context.apiData = apiData;
    this.context.mainContent = document.querySelector('main');
    this.context.navigate = this.navigate.bind(this);

    this.run();
  }

  run() {
    this.context.path = window.location.pathname;

    const foundRoute = this.routes.find((route) => {
      if (route.path instanceof RegExp) {
        return route.path.test(this.context.path);
      }
      return route.path === this.context.path;
    });

    this.context.mainContent.innerHTML = '';
    if (foundRoute) {
      foundRoute.callback(this.context);
    } else {
      const catchAllRoute = this.routes.find((route) => route.path === '*');
      if (catchAllRoute) {
        catchAllRoute.callback(this.context);
      } else {
        this.context.mainContent.innerHTML = '<h1>404</h1>';
      }
    }
    window.scrollTo(0, 0);
  }

  navigate(path) {
    window.history.pushState(null, null, path);
    document.querySelector('body').classList.remove('mobile');
    this.run();
  }
}
