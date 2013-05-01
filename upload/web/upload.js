

/**
 * This is the main function that sets everything up.  It is called once the DOM is loaded.
 * It creates the DataUploadManager object.
 **/
$(function() {
	// Create a new DataUploadManager.
	duman = new DataUploadManager();
});


/**
 * Handles the data source upload form.
 **/
function DataUploadManager() {
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

	// Get the table DOM template for displaying tables in the source data.
	this.dtcontainer = $('#dtcontainer');
	//this.dttemplate = this.dtdiv.children('form > div.datatable').remove()
	this.dttemplate = $('#dtcontainer > div.datatable').remove();

	// Construct a template drop-down list for DwC terms mapping.
	this.maplist_template = $('<select name="template"><option value="none" selected="selected">--none--</option></select>');
	var ml_node = this.maplist_template.get(0);
	for (var cnt = 0; cnt < this.dwc_terms.length; cnt++) {
		ml_node.add(new Option(this.dwc_terms[cnt], this.dwc_terms[cnt]));
	}

	// These variables keep track of the currently selected table and store state information
	// for when the selection changes.
	this.selected_table = {
		name: '',
		table_elem: undefined,
		old_th_row: undefined
	};

	// Make sure the mapping section is hidden and the "upload" button is disabled.
	$('#datatables').hide();
	$(document.dtablesform.next).prop('disabled', true);

	// Set the handler for the upload button.
	$(document.dtablesform.next).click(function(){ self.uploadButtonClicked(); });

	// Make sure the final section is also hidden.
	$('#finished').hide();
}

// A list of the DwC terms that are supported for mapping.
// Excluded terms: all auxiliary terms.
DataUploadManager.prototype.dwc_terms = ['acceptedNameUsage','acceptedNameUsageID','associatedMedia',
'associatedOccurrences','associatedReferences','associatedSequences','associatedTaxa',
'basisOfRecord','bed','behavior','catalogNumber','class','collectionCode','collectionID',
'continent','coordinatePrecision','coordinateUncertaintyInMeters','country','countryCode',
'county','dataGeneralizations','datasetID','datasetName','dateIdentified','day','dcterms:accessRights',
'dcterms:bibliographicCitation','dcterms:language','dcterms:modified','dcterms:references',
'dcterms:rights','dcterms:rightsHolder','dcterms:type','decimalLatitude','decimalLongitude',
'disposition','dynamicProperties','earliestAgeOrLowestStage','earliestEonOrLowestEonothem',
'earliestEpochOrLowestSeries','earliestEraOrLowestErathem','earliestPeriodOrLowestSystem',
'endDayOfYear','establishmentMeans','eventDate','eventID','eventRemarks','eventTime','family',
'fieldNotes','fieldNumber','footprintSpatialFit','footprintSRS','footprintWKT','formation',
'genus','geodeticDatum','geologicalContextID','georeferencedBy','georeferencedDate',
'georeferenceProtocol','georeferenceRemarks','georeferenceSources','georeferenceVerificationStatus',
'group','habitat','higherClassification','higherGeography','higherGeographyID',
'highestBiostratigraphicZone','identificationID','identificationQualifier','identificationReferences',
'identificationRemarks','identificationVerificationStatus','identifiedBy','individualCount',
'individualID','informationWithheld','infraspecificEpithet','institutionCode','institutionID',
'island','islandGroup','kingdom','latestAgeOrHighestStage','latestEonOrHighestEonothem',
'latestEpochOrHighestSeries','latestEraOrHighestErathem','latestPeriodOrHighestSystem',
'lifeStage','lithostratigraphicTerms','locality','locationAccordingTo','locationID',
'locationRemarks','lowestBiostratigraphicZone','maximumDepthInMeters','maximumDistanceAboveSurfaceInMeters',
'maximumElevationInMeters','member','minimumDepthInMeters','minimumDistanceAboveSurfaceInMeters',
'minimumElevationInMeters','month','municipality','nameAccordingTo','nameAccordingToID',
'namePublishedIn','namePublishedInID','namePublishedInYear','nomenclaturalCode',
'nomenclaturalStatus','occurrenceID','occurrenceRemarks','occurrenceStatus','order',
'originalNameUsage','originalNameUsageID','otherCatalogNumbers','ownerInstitutionCode',
'parentNameUsage','parentNameUsageID','phylum','pointRadiusSpatialFit','preparations',
'previousIdentifications','recordedBy','recordNumber','reproductiveCondition','samplingEffort',
'samplingProtocol','scientificName','scientificNameAuthorship','scientificNameID','sex',
'specificEpithet','startDayOfYear','stateProvince','subgenus','taxonConceptID','taxonID',
'taxonomicStatus','taxonRank','taxonRemarks','typeStatus','verbatimCoordinates',
'verbatimCoordinateSystem','verbatimDepth','verbatimElevation','verbatimEventDate',
'verbatimLatitude','verbatimLocality','verbatimLongitude','verbatimSRS','verbatimTaxonRank',
'vernacularName','waterBody','year'];
//DataUploadManager.prototype.dwc_terms = ['scientificName', 'decimalLatitude', 'decimalLongitude'];

// A list of the DwC terms that are required for mapping.
DataUploadManager.prototype.required_terms = ['scientificName', 'decimalLatitude', 'decimalLongitude'];

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
		alert("Error" + (data ? ":\n\nUnable to contact server for data upload.\nResponse="+data : "."));
}

/**
 * Process the uploaded data and display it.
 **/
DataUploadManager.prototype.processUploadData = function(data) {
	var cnt, cnt2;
	this.datasource = data;

	// Clear any content from previous uploads.
	this.dtcontainer.empty();

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
		newdt.children('h3').html(datatable.name);

		// Set the value of the table name radio button.
		newdt.children('input').attr('value', datatable.name);

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

		newdt.appendTo(this.dtcontainer);
	}

	// Set the event handler for the table selection radio buttons.
	var self = this;
	$(document.dtablesform.tablename).change(function(){ return self.tableButtonClicked(this); });

	// Set the first table to be selected by default.
	$(document.dtablesform.tablename).first().attr('checked', 'checked');
	$(document.dtablesform.tablename).first().change();

	// Make the mapping section visible.
	$('#datatables').show();
}

/**
 * Handles selecting a different table name radio button.
 **/
DataUploadManager.prototype.tableButtonClicked = function(element) {
	// Get the table information.
	var index = this.findTableByName(element.value);
	var datatable = this.datasource.tables[index];
	//alert(datatable.name);
	
	// Get the DOM <table> element for this data table.
	var disptable = $(element).siblings('table');
	//alert(disptable);

	// Reset the data structure that tracks column mapping.
	this.column_mapping = {};
	
	// Create a row of <th> elements for the table column names with mapping drop-down lists.
	var rowhtml = datatable.columns.join(': </th><th>');
	rowhtml = '<tr><th>' + rowhtml + '</th></tr>';
	var newtr = $('<tr></tr>');
	var newth, newdp, cnt2;
	var self = this;
	for (var cnt = 0; cnt < datatable.columns.length; cnt++) {
		newth = $('<th>' + datatable.columns[cnt] + ': </th>');
		newdp = this.maplist_template.clone();
		newdp.attr('name', datatable.columns[cnt]);
		newdp.change(function(){ return self.termMappingChanged(this); });
		newth.append(newdp);
		newtr.append(newth);

		// Try to automatically map the column, if possible.
		var opt_dom = newdp.get(0);
		cnt2 = 0;
		do {
			cnt2++;
			if (opt_dom.options[cnt2].value.toLowerCase() == datatable.columns[cnt].toLowerCase()) {
				opt_dom.selectedIndex = cnt2;
				newdp.change();
			}
		} while (cnt2 < opt_dom.options.length - 1 && opt_dom.options[cnt2].value != datatable.columns[cnt]);
	}

	// Replace the old <th> row in the table with the new one.
	var old_th_row = disptable.find('tr').first().remove();
	disptable.prepend(newtr);

	// If a different table was previously selected, restore it to the "unselected" state.
	if (this.selected_table.name != '' && this.selected_table.name != datatable.name) {
		//alert(this.selected_table.table_elem.find('tr').first().html());
		this.selected_table.table_elem.find('tr').first().remove();
		this.selected_table.table_elem.prepend(this.selected_table.old_th_row);
	}

	// Save the old row so it can be used to restore state if the table selection changes and
	// update the table selection state information.
	this.selected_table.name = datatable.name;
	this.selected_table.table_elem = disptable;
	this.selected_table.old_th_row = old_th_row;
}

/**
 * Handles changes to the term mapping drop-down lists.
 **/
DataUploadManager.prototype.termMappingChanged = function(element) {
	var colname = element.name;
	var term = element.options[element.selectedIndex].value;

	// Make sure that the selected term is not already in use.
	if (findKeyByValue(this.column_mapping, term) != null) {
		alert('The term "' + term + '" is already mapped to another column.  Please choose a different term.');
		element.selectedIndex = 0;
		return;
	}
	
	// See if "none" or an actual term name was selected.
	if (element.selectedIndex == 0) {
		// '--none--' was selected, so delete the term mapping for this column,
		// if it exists.
		if (colname in this.column_mapping)
			delete this.column_mapping[colname];
	} else {
		// Update the mapping data structure with the new term mapping.
		this.column_mapping[colname] = term;
	}

	// See if all required terms have been mapped.
	var total = 0;
	for (var colname in this.column_mapping) {
		if (this.required_terms.indexOf(this.column_mapping[colname]) != -1)
			total++;
	}
	if (total == this.required_terms.length)
		$(document.dtablesform.next).prop('disabled', false);
	else
		$(document.dtablesform.next).prop('disabled', true);
}

/**
 * Responds to clicks of the "upload" button.  Sends the user-defined mapping to server, along
 * with the file info, so the data can be uploaded on the server.
 */
DataUploadManager.prototype.uploadButtonClicked = function() {
	var url = 'rest/uploadDataSource';

	var self = this;
	$.ajax({
		url: url,
		type: "POST",
		data: JSON.stringify({
			datasource: this.datasource,
			tablename: this.selected_table.name,
			mapping: this.column_mapping
		}),
		contentType: "application/json; charset=utf-8",
		dataType: "text",
		success: function(result) { self.uploadComplete(result); },
		error: alertError
	});
}

/**
 * Called upon successful completion of a data upload request.
 **/
DataUploadManager.prototype.uploadComplete = function(resultstr) {
	if (isJson(resultstr)) {
		var result = JSON.parse(resultstr);

		if (result[0] == 'success') {
			$('#finished > p').html(result[1] + ' records were uploaded.');
			$('#finished').show();
		} else
			alert('Unexpected response to upload request: ' + result + '.');
	} else
		alert('Unable to parse non-JSON response from server for upload request.');
}

/**
 * Finds a table in the input datasource structure by name.
 * Returns the index of the table if a matching name is found, -1 otherwise.
 **/
DataUploadManager.prototype.findTableByName = function(name) {
	for (var cnt = 0; cnt < this.datasource.tables.length; cnt++) {
		if (this.datasource.tables[cnt].name == name)
			return cnt;
	}

	return -1;
}


/**
 * A simple function to search an obect (i.e., associative array) for a particular
 * value and return the matching key if the value is found.
 **/
findKeyByValue = function(object, value) {
	for (var key in object) {
		if (object[key] == value)
			return key;
	}

	return null;
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
