var drawAreaChart;

(function () {
    var fadeIn = function(d) {

        var pos = d3.mouse(this);
        console.log(d);

        $("#pop-up").fadeOut(100,function () {
            $("#pop-up-title").html(d.name);
            $("#pop-up-list").html("");
            var entry = _.find(data.hierarchy.languages.children, function(i) {return i.name == d.name;} );
            if (typeof(entry) === "undefined") {
                entry = _.find(data.hierarchy.tools.children, function(i) {return i.name == d.name;} );
            }
            var items = _.map(entry.children, function(c) {
                var start = c.name.indexOf(" at ");
                return c.name.substr(start + 4);
            } );
            $.each(items, function(i, item) {
                $("#pop-up-list").append("<li>" + item + "</li>");
            });

            var popLeft = pos[0] + "px";
            var popTop = pos[1] + "px";
            $("#pop-up").css({left:popLeft, top:popTop, position: "fixed"});
            $("#pop-up").fadeIn(100);
        });
    };

    var fadeOut = function(d) {
        $("#pop-up").fadeOut(50);
    };

    drawAreaChart = function(elementId, chartData, colors) {
        var $container = $('.card-wrapper');
        var margin = {top: 20, right: 100, bottom: 30, left: 50};
        var width = $container.width() - margin.left - margin.right - 75;
        var height = 300 - margin.top - margin.bottom;

        var startDate = chartData[0].date;
        var endDate = chartData[chartData.length-1].date;

        var x = d3.time.scale()
            .domain([startDate, endDate])
            .range([0, width]);

        var yMax = 0;

        _.each(chartData[chartData.length-1], function(d,k) {
            if (k != "date") {
                yMax = yMax + d;
            }
        });

        var y = d3.scale.linear()
            .domain([yMax, 0])
            .range([0, height]);

        var keys = d3.keys(chartData[0]).filter(function (key) {
            return key !== "date";
        });
        keys.reverse();
        var color = colors.domain(keys);

        var area = d3.svg.area()
            .x(function (d) {
                return x(d.date);
            })
            .y0(function (d) {
                return y(d.y0);
            })
            .y1(function (d) {
                return y(d.y0 + d.y);
            });

        var stack = d3.layout.stack()
            .values(function (d) {
                return d.values;
            });

        d3.select(elementId).selectAll("svg").remove();

        var svg = d3.select(elementId).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var items = stack(color.domain().map(function (name) {
            return {
                name: name,
                values: chartData.map(function (d) {
                    return {date: d.date, y: d[name]};
                })
            };
        }));

        var item = svg.selectAll(".item")
            .data(items)
            .enter().append("g")
            .attr("class", "item");

        item.append("path")
            .attr("class", "area")
            .attr("d", function (d) {
                return area(d.values);
            })
            .style("fill", function (d) {
                return color(d.name);
            })
            .on("mouseover", fadeIn)
            .on("mouseout", fadeOut);

        item.append("text")
            .datum(function (d) {
                return {name: d.name, value: d.values[d.values.length - 1]};
            })
            .attr("transform", function (d) {
                return "translate(" + x(d.value.date) + "," + y(d.value.y0 + d.value.y / 4) + ")";
            })
            .attr("x", 0)
            .attr("dy", ".35em")
            .text(function (d) {
                return d.name;
            });

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);
    };

    var setFilterHook = function() {
        d3.selectAll(".filterButtonLanguage").on("change", function() {
            if (this.checked) {
                data.filter.languages.push(this.name);
            }
            else {
                var i = data.filter.languages.indexOf(this.name);
                data.filter.languages.splice(i, 1);
            }
            data.reloadLanguageData();
            drawAreaChart('#languageChart',data.languageChartData, data.languageColors);
        });
        d3.selectAll(".filterButtonTool").on("change", function() {
            if (this.checked) {
                data.filter.tools.push(this.name);
            }
            else {
                var i = data.filter.tools.indexOf(this.name);
                data.filter.tools.splice(i, 1);
            }
            data.reloadToolData();
            drawAreaChart('#toolChart',data.toolChartData, data.toolColors);
        });
    };

    data.whenDataLoaded(function() {
        drawAreaChart('#languageChart',data.languageChartData, data.languageColors);
        drawAreaChart('#toolChart',data.toolChartData, data.toolColors);
        setFilterHook();
    });
})();