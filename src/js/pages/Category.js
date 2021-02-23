import slugify from '../utils/slugify';
import appendVideoToGallery from '../utils/appendVideoToGallery';

function findCategoryNameBySlug(slug, videoArray) {
  for (let i = 0; i < videoArray.length; i++) {
    for (let j = 0; j < videoArray[i].categories.length; j++) {
      const cat = videoArray[i].categories[j];
      if (slugify(cat) === slug) {
        return cat;
      }
    }
  }
  return '';
}

export default ({ mainContent, videoDataArray, path, navigate }) => {
  const categorySlug = path.replace('/category/', '');
  const categoryName = findCategoryNameBySlug(categorySlug, videoDataArray);
  mainContent.innerHTML = `
    <div class="page-title">
        <h2>${categoryName}</h2>
        <img src="/arrow-down.svg" alt="" />
    </div>
    <div class="category"></div>
  `;
  const content = mainContent.querySelector('.category');
  const filteredVideoDataArray = videoDataArray.filter((videoData) => videoData.categories.includes(categoryName));
  appendVideoToGallery(filteredVideoDataArray, navigate, '', content);
}
