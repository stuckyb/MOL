
function getUrlVars()
    {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for (var i = 0; i < hashes.length; i++)
        {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }
        return vars;
    }
$(document).ready(function() {
    var limit = 10;
    runQuery = function(offset) {
            $('.loading').show();
            //$(".inner").hide()
            var val = $('.search').val();
            var vars = {'search': val,'format':'json','limit':limit};
            if (offset) { vars['offset'] = offset }
            $.post('/api/taxonomy', vars, function(data) {
                $('.inner').html('').append($("<div class='time'></div>"));
                $('.inner .time').html('Query time: ' + data.time + ' sec');

                $.each(data.items, function(i,item) {
                    var ndiv = $("<div class='return'></div>");
                    var nms = $("<div class='names'></div>");
                    nms.append('other names:');
                    var spec = $("<div class='species'></div>");
                    var tax = $("<div class='taxonomy'></div>");
                    tax.html('taxonomy: ' + item.classification.kingdom + ': ' + item.classification.phylum + ': ' + item.classification.class + ': ' + item.classification.order + ': ' + item.classification.family);
                    var brk = $("<div class='break'></div>");
                    $.each(item.names, function(j,name) {
                        if (name.type == 'accepted name') {
                            spec.html(name.name + ' <i>' + name.author + '</i>');
                        }else {
                            $(nms).append(name.name + ', ');
                        }
                    });
                    ndiv.append(brk);
                    ndiv.append(spec);
                    ndiv.append(tax);
                    ndiv.append(nms);
                    $('.inner').append(ndiv);
                });
                var limits = $("<div id='limits'></div>");
                limits.append("<div class='limit' id='100'>100</div>");
                limits.append("<div class='limit' id='50'>50</div>");
                limits.append("<div class='limit' id='10'>10</div>");
                limits.children().click(function(e){ 
                    limit = this.id;
                    runQuery(data.offset);
                });
                
                var next = $("<button id='next' name='next' value='" + (data.offset + data.limit) + "'>Next</button>");
                next.attr('disabled', true);
                var last = $("<button id='last' name='last' value='" + (data.offset - data.limit) + "'>Last</button>");
                last.attr('disabled', true);

                if (data.items.length == 10) {
                    next.attr('disabled', false);
                    next.click(function() {
                        runQuery(next.val());
                    });
                }
                if (data.offset > 0) {
                    //console.log(data.last)
                    last.attr('disabled', false);
                    last.click(function() {
                        runQuery(last.val());
                    });
                }
                $('.inner .time').append(next);
                $('.inner .time').append(last);

                $('.loading').hide(20);
                $('.inner').show();
                $('.inner').append(limits);
            },'json');
    }
    $('.search').keypress(function(e) {
        if (e.which == 13) {
            runQuery();
            window.location.hash = $('.search').val();
        }
    });

    if (location.href.indexOf('#') != -1) {
        $('.search').val(window.location.hash.substr(1));
        runQuery();
    }

});
