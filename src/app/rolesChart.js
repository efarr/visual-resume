visualResume.directive('rolesChart', function(){

    var drawRolesTimeline = function(data, elem) {

        var $container = $('.card-wrapper');
        var width = $container.width() - 70;
        var hoverDiv = $('#hoverRes');
        var coloredDiv = hoverDiv.find('.coloredDiv');
        var nameDiv = hoverDiv.find('#name');

        var chart = d3.timeline()
            .width(width)
            .stack()
            .margin({left:70, right:30, top:0, bottom:0})
            .hover(function (d, i, datum) {
                var colors = chart.colors();
                coloredDiv.css('background-color', colors(i));
                nameDiv.html("&nbsp;" + d.project);
            })
            .mouseout(function(){
                coloredDiv.css('background-color', '');
                nameDiv.html("");
            })
            .click(function (d, i, datum) {
                //alert(d.project);
            });

        var svg = d3.select(elem).insert("svg", ":first-child").attr("width", width)
            .datum(data).call(chart);
    };

    function link(scope, element, attr) {
        data.whenDataLoaded(function() {
            drawRolesTimeline(data.roleData, element[0]);
        });
    }

    return {
        link: link,
        template: '<div id="hoverRes"><div class="coloredDiv"></div><div id="name"></div></div>',
        restrict: 'E'
    };
});