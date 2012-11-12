//Put html snippets here
mol_mobile.prototype.templates = {
	main : {
		listItem : '' +
			'<li class="speciesListItem"><i>{0}</i>&nbsp;{1}</li>'
	},
	images : {
		galleryItem : '' +
			'<span>'+
				'<a href="#{0}-popup" data-rel="popup" class="galleryItem" class=>' +
					'<img src="{1}">'+
				'</a>'+
				'<div data-role="popup" class="photopopup" id="{0}-popup">'+
					'<img src=\'{3}\'" class="photo"><br>'+
					'{2}'+
				'</div>'+
			'</span>',
	}
}
