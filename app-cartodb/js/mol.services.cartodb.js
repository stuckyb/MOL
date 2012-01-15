mol.modules.services.cartodb = function(mol) {
  
    mol.services.cartodb = {};
    
    mol.services.cartodb.SqlApi = Class.extend(
        {
            init: function(user, host) {
                this.url = 'http://{0}.{1}/api/v1/sql?q='.format(user, host);
            },

            query: function(sql, callback) {
                var encodedSql = encodeURI(sql),
                    request = '{0}{1}'.format(this.url, encodedSql),
                    xhr = $.getJSON(request); 
                
                xhr.success(
                    function(response) {
                        callback.success(response);
                    }
                );

                xhr.error(
                    function(response) {
                        callback.failure(response);
                    }
                );
            }
        }
    );
    
    // TODO: Put params in mol.config.js
    mol.services.cartodb.sqlApi = new mol.services.cartodb.SqlApi('layers', 'moldb.io:8080');
    
    mol.services.cartodb.query = function(sql, callback) {
        mol.services.cartodb.sqlApi.query(sql, callback);
    };
};