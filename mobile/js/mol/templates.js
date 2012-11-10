//Put html snippets here
mol_mobile.prototype.templates = {
	main : {
		list: '' +
			'<ul class="speciesList" data-role="listview" data-inset="true" data-filter="true"></ul>',
		listItem : '' +
			'<li class="speciesListItem">{0}</li>',
		getListButton: '' +
			'<button class="getList">Get a new list</button>'
	},
	images : {
		gallery: '' +
			'<div class="imageGallery" data-role="listview" data-filter="true"></div>',
		galleryItem : '' +
			'<a href="{1}"><img class="galleryItem" src="{0}"></a>',
	}
}
