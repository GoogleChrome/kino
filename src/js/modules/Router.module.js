import { setHeaderToggle } from '../utils/settings';

const globalClickHandler = (navigate) => (e) => {
  const target = e.path[0];
  if (e.ctrlKey || e.metaKey) return;
  if (target.href) {
    e.preventDefault();
    navigate(target.href);
  }
};

export default class Router {
  constructor() {
    this.routes = [];

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
    this.videoDataArray = await fetch('/api.json')
      .then((response) => response.json());
    this.run();
  }

  run() {
    const mainContent = document.querySelector('main');
    const { videoDataArray } = this;
    const path = window.location.pathname;

    const navigate = this.navigate.bind(this);
    const callbackArgs = {
      mainContent, videoDataArray, path, navigate,
    };
    const foundRoute = this.routes.find((route) => {
      if (route.path instanceof RegExp) {
        return route.path.test(path);
      }
      return route.path === path;
    });
    if (foundRoute) {
      mainContent.innerHTML = '';
      foundRoute.callback(callbackArgs);
    } else {
      const catchAllRoute = this.routes.find((route) => route.path === '*');
      if (catchAllRoute) {
        mainContent.innerHTML = '';
        catchAllRoute.callback(callbackArgs);
      } else {
        mainContent.innerHTML = '<h1>404</h1>';
      }
    }

    window.scrollTo(0, 0);

    setHeaderToggle();
  }

  navigate(path) {
    window.history.pushState(null, null, path);
    document.querySelector('body').classList.remove('mobile');
    this.run();
  }
}
