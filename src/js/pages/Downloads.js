export default ({ mainContent }) => {
  mainContent.innerHTML = `
    <div class="page-title">
        <h2>Manage your downloads</h2>
        <img src="/arrow-down.svg" alt="" />
    </div>
    <div class="downloads">
        <div class="header">
            <span>20 GB available <span>of 220 GB</span></span>
            <div>
                <button class="primary">Delete all</button>
            </div>
        </div>
        <div class="content"></div>
    </div>
  `;
  mainContent.querySelector('.content').innerHTML = `
    <download-card></download-card>
    <download-card></download-card>
  `;
}
