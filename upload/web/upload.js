

/**
 * This is the main function that sets everything up.  It is called once the DOM is loaded.
 * It creates the DataUploadManager object.
 **/
$(function() {
	// Create a new DataUploadManager.
	var duman = new DataUploadManager();
});


/**
 * Handles the data source upload form.
 **/
function DataUploadManager() {
	// Get the DOM for the table row that we want to use as a template for creating new rows.
	this.dbSourceTrTemplate = $("#schemaTable > tbody").children(":last").remove();

	// Get the DOM for the data owner component to use as a template for creating new rows.
	// We have to remove the template DOM from the document and add a copy so that subsequent
	// copies don't clone the user's form entries.
	this.owner_cnt = 0;
	this.ownerTemplate = $("#uploadForm > div.data_owners > div.data_owner").remove();
	this.addOwner();

	// Set event handlers for the data source form submit button and data owner button.
	var self = this;
	$("#uploadForm").submit(function(){ return self.uploadFormSubmitted(this); });
	$("#uploadForm input[name=add_owner]").click(function(){ return self.addOwner(); });

	// Get the table DOM template.
	this.dtdiv = $('#datatables');
	this.dttemplate = this.dtdiv.children('div.datatable').remove()
}

DataUploadManager.prototype.addOwner = function() {
	var owners_div = $("#uploadForm > div.data_owners");
	var new_owner = this.ownerTemplate.clone();

	this.owner_cnt++;
	var label = "Data owner";
	if (this.owner_cnt > 1)
		label += " " + this.owner_cnt;

	new_owner.children('p').html(label);
	new_owner.appendTo(owners_div);
}

/**
 * Responds to submit events on the data source upload form.  This method checks the upload
 * form data and provides a handler for the finished upload event.
 **/
DataUploadManager.prototype.uploadFormSubmitted = function(evtsrc) {
	// Make sure a file name was provided.
	if (!evtsrc.file.value) {
		alert("Please select a file to upload.");
		evtsrc.file.focus();
		return false;
	}

	var self = this;
	//setStatus("Uploading file:</br>'" + evtsrc.file.value + "'");
	$("#uploadTarget").one("load", function(){ self.getUploadData(); });

	return true;
}

/**
 * Called after an input file is uploaded.
 **/
DataUploadManager.prototype.getUploadData = function() {
	setStatus("");

	var data = frames.uploadTarget.document.body.textContent;
	// distinguish response OK status by JSON format
	if (isJson(data))
		this.processUploadData(JSON.parse(data));
	else
		alert("Error" + (data ? ":\n\nUnable to contact server for data upload\nResponse="+data : "."));
}

/**
 * Process the uploaded data and display it.
 **/
DataUploadManager.prototype.processUploadData = function(data) {
	var cnt, cnt2;

	// Clear any content from previous uploads.
	this.dtdiv.empty();

	// Generate a list of the table names.
	var tablenames = [];
	for (cnt = 0; cnt < data.tables.length; cnt++)
		tablenames.push(data.tables[cnt].name);

	// Display the metadata.
	$('#metainfo').html('Date and Time: ' + data.datetime + '<br />'
			+ 'Input File: ' + data.source_fname + '<br />'
			+ 'Tables: ' + tablenames.join(', '));

	// Process the data tables.
	var datatable, disptable, rowhtml;
	for (cnt = 0; cnt < data.tables.length; cnt++) {
		// Get the next table from the data source.
		datatable = data.tables[cnt];
		// Create a new data table <div> from the template.
		var newdt = this.dttemplate.clone();
		// Get the display table DOM object from the new data table <div>.
		disptable = newdt.children('table');

		// Set the table name.
		newdt.children('h2').html(datatable.name);

		// Create a row of <th> elements for the table column names.
		rowhtml = datatable.columns.join('</th><th>');
		rowhtml = '<tr><th>' + rowhtml + '</th></tr>';
		$(rowhtml).appendTo(disptable);

		// Now create DOM <tr> elements for each row of data.
		for (cnt2 = 0; cnt2 < datatable.data.length; cnt2++) {
			rowhtml = datatable.data[cnt2].join('</td><td>');
			rowhtml = '<tr><td>' + rowhtml + '</td></tr>';
			$(rowhtml).appendTo(disptable);
		}

		newdt.appendTo(this.dtdiv);
	}
}


function alertError(xhr, status, error) {
	setStatus("");
	alert(status + ': ' + error + '\n' + 'response status: ' + xhr.status + '\n' + xhr.responseText)
	//alert(status + (xhr.status==500 ? ":\n\n"+xhr.responseText : (error ? ": "+error : "")));
}

function setStatus(status) {
	$("#status").html(status);
	$("#status, #overlay").fadeToggle(status);
}

function isJson(data) {
	if (!data)
		return false;
	var firstChar = data.charAt(0),
		lastChar = data.charAt(data.length-1);
	return firstChar=='{' && lastChar=='}'
			|| firstChar=='[' && lastChar==']'
			|| firstChar=='"' && lastChar=='"';
}
	
jQuery.prototype.fadeToggle = function(fadeIn) {
	if (fadeIn)
		this.fadeIn();
	else
		this.fadeOut();
};
