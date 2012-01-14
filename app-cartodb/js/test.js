Test = Class.extend(
    {
        init: function(element) {
            if (!element) {
                element = '<div>';
            }
            _.extend(this, $(element));
        }   
    }
);