 _createNewFilter: function(name, data){ // data = profile
                var allTypes,
                    display = this._display,
                    filter = display.getNewFilter(),
                    keys = data[name.toLowerCase()],
                    self = this,
                    option = null,
                    tmpKeys = [],
                    k = null;

                filter.getFilterName().text(name);
                filter.attr('id', name);

                allTypes = filter.getNewOption();
                allTypes.text("All " + name);
                allTypes.addStyleName("all");
                allTypes.click(this._allTypesCallback(filter, name));
                allTypes.addStyleName("selected");
                for (k in keys) {
                    tmpKeys.push(k);
                }
                tmpKeys.sort();
                for (i in tmpKeys) {
                    k = tmpKeys[i];
                    option = filter.getNewOption();
                    option.text(k);
                    option.click(this._optionCallback(filter, name));
                }
            },


            _allTypesCallback: function(filter, name) {
                var self = this;
                return function(event) {                    
                    var fo = filter.getOptions();
                    for (o in fo) {
                        fo[o].removeStyleName("selected");
                    }
                    new mol.ui.Element(event.target).addStyleName("selected");                    
                    self._processFilterValue(name, null);
                    };
            },

            _optionCallback: function(filter, name) {                
                var self = this;
                return function(event) {
                    var fo = filter.getOptions();
                    for (o in fo){
                        fo[o].removeStyleName("selected");
                    }
                    new mol.ui.Element(event.target).addStyleName("selected");                            
                    self._processFilterValue(name, new mol.ui.Element(event.target).text());
                }; 
            },
 
            _processFilterValue: function(key, value){
                var layers = new Array(),
                    self = this,
                    tmp = null;
                
                switch(key.toLowerCase()) {
                    case "names":
                        self._nameFilter = value;
                        break;
                    case "sources":
                        self._sourceFilter = value;
                        break;
                    case "types":
                        self._typeFilter= value;
                        break;
                    default:
                        break;
                }
          
                tmp = this._result.getLayers(
                    self._nameFilter,
                    self._sourceFilter,
                    self._typeFilter);

                for (v in tmp) {
                    layers.push(this._result.getLayer(tmp[v]));
                }
                
                this._displayPage(layers);
            },
