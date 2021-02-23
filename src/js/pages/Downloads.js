export default ({ mainContent }) => {
  mainContent.innerHTML = `
    <style>
      .grid {
        margin-top: 2rem;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(450px, 100%), 1fr));
        grid-gap: 2rem;
      }
    </style>
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
        <div class="grid"></div>
    </div>
  `;
  mainContent.querySelector('.grid').innerHTML = `
    <download-card></download-card>
    <download-card></download-card>
  `;
}
