// Inplace Search
let search = document.getElementById('search');
if (search) {
    search.addEventListener('keyup', filterIcons);
    function filterIcons() {
        let searchWord = this.value.toLowerCase();
        let iconList = document.getElementById('iconlist');
        let icons = iconList.querySelectorAll('[data-type="icon"]');
        for (let i = 0; i < icons.length; i++) {
            let icon = icons[i];
            let elementSearch = icon.dataset.search;
            if (elementSearch.toLowerCase().indexOf(searchWord) > -1) {
                icon.style.display = 'flex';
            } else {
                icon.style.display = 'none';
            }
        }
    }
}
