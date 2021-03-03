export default class Router {
  constructor() {
    this.routes = [];

    window.addEventListener('popstate', () => this.run());

    document.querySelector('.mobile-button').addEventListener('click', () => {
      document.querySelector('body').classList.toggle('mobile');
    });

    // Upgrade static links
    const navigate = this.navigate.bind(this);
    // eslint-disable-next-line func-names
    document.querySelectorAll('a[href]').forEach((link) => link.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      navigate(this.href);
    }));

    this.init();
  }

  route(path, callback) {
    this.routes.push({ path, callback });
  }

  async init() {
    this.videoDataArray = await fetch('/api/video-list.json')
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
  }

  navigate(path) {
    window.history.pushState(null, null, path);
    document.querySelector('body').classList.remove('mobile');
    this.run();
  }
}
