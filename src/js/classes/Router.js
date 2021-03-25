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
      document.body.classList.toggle('disable-scroll');
    });

    // Global click listener setup
    document.addEventListener('click', this.clickHandler.bind(this));

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

  /**
   * Responds to click events anywhere in the document and when
   * the click happens on a link that is supposed to be handled
   * by the router, loads and displays the target page.
   *
   * @param {Event} e Click event.
   */
  clickHandler(e) {
    const closestParentLink = e.path.find((el) => el.tagName === 'A');
    const isRouterLink = closestParentLink && 'useRouter' in closestParentLink.dataset;
    const isStandardClick = !e.ctrlKey && !e.metaKey;

    if (isRouterLink && isStandardClick) {
      e.preventDefault();
      this.navigate(closestParentLink.href);
    }
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
    const headerElement = document.querySelector('.site-header');

    // Close mobile menu when navigation takes place.
    headerElement.classList.remove('open');
    document.body.classList.remove('disable-scroll');

    // Mark the active page in menu.
    [...headerElement.querySelectorAll('.site-header--menu-item a')].forEach(
      (menuLink) => (menuLink.href === href
        ? menuLink.classList.add('active')
        : menuLink.classList.remove('active')
      ),
    );

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
    // Render the new page.
    this.renderPage(href);
  }
}
