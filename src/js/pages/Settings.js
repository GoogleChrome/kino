export default ({ mainContent }) => {
  mainContent.innerHTML = `
    <div class="page-title">
        <h2>Settings</h2>
        <img src="/arrow-down.svg" alt="" />
    </div>
    <div class="settings">
      <div class="option">
        <toggle-button checked></toggle-button>
        <div>
          <h4>Show offline content only</h4>
          <p>When enabled, you will only be shown content that is available offline.</p>
        </div>
      </div>
      <div class="option">
        <toggle-button></toggle-button>
        <div>
          <h4>Prefetch popular content</h4>
          <p>When enabled, the app will periodically prefetch the first portion ofpopular content. This means that you when you want to watch videoit can begin playback immediately without buffering. Please note:this feature will use bandwidth.</p>
        </div>
      </div>
    </div>
  `;
}
