const globalClickHandler = (navigate) => (e) => {
  const target = e.path[0];
  if (e.ctrlKey || e.metaKey) return;
  if ('useRouter' in target.dataset) {
    e.preventDefault();
    navigate(target.href);
  }
};

/**
 * Facilitates navigation within the application and initializes
 * page views based on the matched routes.
 */
export default class Router {
  /**
   *
   * @param {object} context Any initial context to be passed to pages.
   */
  constructor(context = {}) {
    this.routes = [];
    this.context = context;
    this.currentPage = null;

    window.addEventListener('popstate', (e) => {
      this.renderPage(e.state.href, true);
    });

    // Toggle menu open.
    document.querySelector('.site-header--hamburger-btn').addEventListener('click', () => {
      document.querySelector('.site-header').classList.toggle('open');
    });

    // Global click listener setup
    const navigate = this.navigate.bind(this);
    document.addEventListener('click', globalClickHandler(navigate));

    this.init();
  }

  /**
   * Registers a route.
   *
   * @param {string}   path     Route path.
   * @param {Function} callback Callback method.
   */
  route(path, callback) {
    this.routes.push({ path, callback });
  }

  async init() {
    const response = await fetch('/api.json');
    const apiData = await response.json();

    this.context.apiData = apiData;
    this.context.mainContent = document.querySelector('main');
    this.context.navigate = this.navigate.bind(this);

    this.renderPage(window.location.href);
  }

  /**
   * Finds appropriate callback and executes it.
   *
   * @param {string}  href      Target URL to navigate to.
   * @param {boolean} skipState Flag indicating whether push state should be skipped.
   */
  renderPage(href = '/', skipState = false) {
    const targetUrl = new URL(href, window.location.origin);
    const foundRoute = this.routes.find(
      ({ path }) => new RegExp(path).test(targetUrl.pathname),
    );

    /**
     * Only push new state when this is a navigation between pages
     * and `skipState` is not true.
     */
    const isNavigationBetweenPages = this.currentPage !== foundRoute.callback;
    if (!skipState && isNavigationBetweenPages) {
      window.history.pushState({ href }, null, targetUrl.pathname);
    }

    window.scrollTo(0, 0);
    this.context.path = targetUrl.pathname;
    this.context.mainContent.innerHTML = '';
    this.currentPage = foundRoute.callback;
    foundRoute.callback(this.context);
  }

  /**
   * Invoked when an internal link is clicked / tapped.
   *
   * @param {string} href Target URL to navigate to.
   */
  navigate(href) {
    document.querySelector('body').classList.remove('mobile');
    this.renderPage(href);
  }
}
