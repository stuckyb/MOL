
function mol_mobile () {
	var self = this;
	//app globals go here
	this.url = 'http://mol.cartodb.com/api/v2/sql?q={0}&callback=?';
	
	//get some page refs 
	this.pages = {
		main: $.find('.mainPage'),
		images: $.find('.imagesPage'),
		settings: $.find('.settingsPage')
	};
	
	//hook up some events
	this.attachEvents();
	
	//start it up
	this.getLocation();
}
mol_mobile.prototype.attachEvents = function () {
	var self = this;
}
mol_mobile.prototype.getList = function () {
	var self = this;
	$.mobile.loading('show');
	$(this.pages.main).find('.speciesList').empty();
	$(this.pages.images).find('.imageGallery').empty();
	$.getJSON(
		this.url.format(
			'SELECT * FROM get_species_list(\'{0}\',{1},{2},{3})'.format(
				$('.listType').val(),
				this.position.coords.longitude, 
				this.position.coords.latitude, 
				$('.listRadius').val()
			)
		),
		function(response) {
			self.writeList(response.rows);
			$.mobile.loading('hide');
		}
	)
}
mol_mobile.prototype.getLocation = function () {
	var self = this;
	if(navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			function(position) {
				self.position = position;
				self.getList();
			},
			function(err) {
				self.position = {
					latitude: prompt('What is your latitude?'),
					longitude: prompt('What is your longitude?')
				}
			},
			{
				timeout: 6000
			}
		);
	} else {
		this.position = {
			latitude: prompt('What is your latitude?'),
			longitude: prompt('What is your longitude?')
		}
	}
}
mol_mobile.prototype.writeList = function(rows) {
	var self = this,
		//create a list
		list = $(this.pages.main).find('.speciesList'),
		gallery = $(this.pages.images).find('.imageGallery');
	//add rows to it
	$.each(
		rows,
		function(row) {
			list.append(
				$(self.templates.main.listItem.format(rows[row].scientificname))
			);
			if(rows[row].thumbsrc != null) {
				gallery.append(
					$(self.templates.images.galleryItem.format(rows[row].thumbsrc, rows[row].imgsrc ))
				)
			}
		}
	)
	
	//add it to the page
	
	
} 
/**
 * https://gist.github.com/1049426
 * 
 * Usage: 
 * 
 *   "{0} is a {1}".format("Tim", "programmer");
 * 
 */
String.prototype.format = function(i, safe, arg) {
  function format() {
      var str = this, 
          len = arguments.length+1;
      
      for (i=0; i < len; arg = arguments[i++]) {
          safe = typeof arg === 'object' ? JSON.stringify(arg) : arg;
          str = str.replace(RegExp('\\{'+(i-1)+'\\}', 'g'), safe);
      }
      return str;
  }
  format.native = String.prototype.format;
  return format;
}();

