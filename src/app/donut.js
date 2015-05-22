visualResume.directive('donut', function(){

    var width = 300,
        height = 200,
        radius = 175 / 2;

    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) {
            return d.days;
        });

    var arc = d3.svg.arc()
        .outerRadius(radius * 0.8)
        .innerRadius(radius * 0.3);

    var outerArc = d3.svg.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9);

    var key = function(d){ return d.data.name; };

    var oldPieData = {};

    var pieTween = function (d, i) {

        var theOldDataInPie = oldPieData;
        // Interpolate the arcs in data space

        var s0;
        var e0;

        if (theOldDataInPie[i]) {
            s0 = theOldDataInPie[i].startAngle;
            e0 = theOldDataInPie[i].endAngle;
        } else if (!(theOldDataInPie[i]) && theOldDataInPie[i - 1]) {
            s0 = theOldDataInPie[i - 1].endAngle;
            e0 = theOldDataInPie[i - 1].endAngle;
        } else if (!(theOldDataInPie[i - 1]) && theOldDataInPie.length > 0) {
            s0 = theOldDataInPie[theOldDataInPie.length - 1].endAngle;
            e0 = theOldDataInPie[theOldDataInPie.length - 1].endAngle;
        } else {
            s0 = 0;
            e0 = 0;
        }

        var interpolate = d3.interpolate({
            startAngle: s0,
            endAngle: e0
        }, {
            startAngle: d.startAngle,
            endAngle: d.endAngle
        });

        return function (t) {
            var b = interpolate(t);
            return arc(b);
        };
    };

    var removePieTween = function (d, i) {
        s0 = 2 * Math.PI;
        e0 = 2 * Math.PI;
        var interpolate = d3.interpolate({
            startAngle: d.startAngle,
            endAngle: d.endAngle
        }, {
            startAngle: s0,
            endAngle: e0
        });

        return function (t) {
            var b = interpolate(t);
            return arc(b);
        };
    };

    var buildSvg = function(element) {
        return d3.select(element).append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
    };

    var draw = function(data, svg, label, value, color) {

        var piedata = pie(data);

        //create a marker element if it doesn't already exist
        var defs = svg.select("defs");
        if (defs.empty() ) {
            defs = svg.append("defs");
        }
        var marker = defs.select("marker#circ");
        if (marker.empty() ) {
            defs.append("marker")
                .attr("id", "circ")
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("refX", 3)
                .attr("refY", 3)
                .append("circle")
                .attr("cx", 3)
                .attr("cy", 3)
                .attr("r", 3);
        }
        //Create/select <g> elements to hold the different types of graphics
        //and keep them in the correct drawing order
        var pathGroup = svg.select("g.piePaths");
        if (pathGroup.empty() ){
            pathGroup = svg.append("g")
                .attr("class", "piePaths");
        }
        var pointerGroup = svg.select("g.pointers");
        if (pointerGroup.empty() ) {
            pointerGroup = svg.append("g")
                .attr("class", "pointers");
        }
        var labelGroup = svg.select("g.labels");
        if (labelGroup.empty() ) {
            labelGroup = svg.append("g")
                .attr("class", "labels");
        }

        var path = pathGroup.selectAll("path.pie")
            .data(piedata);

        path.enter().append("path")
            .attr("class", "pie")
            .attr("fill", function (d, i) {
                return color(d.data.name);
            });

        path.transition()
            .duration(300)
            .attrTween("d", pieTween);

        path.exit()
            .transition()
            .duration(300)
            .attrTween("d", removePieTween)
            .remove();

        var labels = labelGroup.selectAll("text")
            .data(piedata
                .sort(function(p1,p2) { return p1.startAngle - p2.startAngle;})
        );
        labels.enter()
            .append("text")
            .attr("text-anchor", "middle");
        labels.exit()
            .remove();

        var labelLayout = d3.geom.quadtree()
            .extent([[-width,-height], [width, height] ])
            .x(function(d){return d.x;})
            .y(function(d){return d.y;})
        ([]); //create an empty quadtree to hold label positions
        var maxLabelWidth = 0;
        var maxLabelHeight = 0;

        labels.text(function (d) {
            // Set the text *first*, so we can query the size
            // of the label with .getBBox()
            return d.data.name;
        })
            .each(function (d, i) {
                // Move all calculations into the each function.
                // Position values are stored in the data object
                // so can be accessed later when drawing the line

                /* calculate the position of the center marker */
                var a = (d.startAngle + d.endAngle) / 2 ;

                //trig functions adjusted to use the angle relative
                //to the "12 o'clock" vector:
                d.cx = Math.sin(a) * (radius - 35);
                d.cy = -Math.cos(a) * (radius - 35);

                /* calculate the default position for the label,
                 so that the middle of the label is centered in the arc*/
                var bbox = this.getBBox();

                //bbox.width and bbox.height will
                //describe the size of the label text
                var labelRadius = radius + 10;
                d.x =  Math.sin(a) * (labelRadius);
                d.l = d.x - bbox.width / 2 - 2;
                d.r = d.x + bbox.width / 2 + 2;
                d.y = -Math.cos(a) * (radius);
                d.b = d.oy = d.y + 5;
                d.t = d.y - bbox.height - 5 ;

                /* check whether the default position
                 overlaps any other labels*/
                var conflicts = [];
                labelLayout.visit(function(node, x1, y1, x2, y2){
                    //recurse down the tree, adding any overlapping
                    //node is the node in the quadtree,
                    //node.point is the value that we added to the tree
                    //x1,y1,x2,y2 are the bounds of the rectangle that
                    //this node covers

                    if (  (x1 > d.r + maxLabelWidth/2) ||
                            //left edge of node is to the right of right edge of label
                          (x2 < d.l - maxLabelWidth/2) ||
                            //right edge of node is to the left of left edge of label
                          (y1 > d.b + maxLabelHeight/2) ||
                            //top (minY) edge of node is greater than the bottom of label
                          (y2 < d.t - maxLabelHeight/2 ) )
                            //bottom (maxY) edge of node is less than the top of label

                        return true; //don't bother visiting children or checking this node

                    var p = node.point;
                    var v = false, h = false;
                    if ( p ) { //p is defined, i.e., there is a value stored in this node
                        h =  ( ((p.l > d.l) && (p.l <= d.r)) ||
                               ((p.r > d.l) && (p.r <= d.r)) ||
                               ((p.l < d.l)&&(p.r >=d.r) ) ); //horizontal conflict

                        v =  ( ((p.t > d.t) && (p.t <= d.b)) ||
                               ((p.b > d.t) && (p.b <= d.b)) ||
                               ((p.t < d.t)&&(p.b >=d.b) ) ); //vertical conflict

                        if (h&&v)
                            conflicts.push(p); //add to conflict list
                    }
                });

                if (conflicts.length) {
                    //console.log(d, " conflicts with ", conflicts);
                    var rightEdge = d3.max(conflicts, function(d2) {
                        return d2.r;
                    });

                    //d.l = rightEdge;
                    //d.x = d.l + bbox.width / 2 + 5;
                    //d.r = d.l + bbox.width + 10;
                }
                //else console.log("no conflicts for ", d);

                /* add this label to the quadtree, so it will show up as a conflict
                 for future labels.  */
                labelLayout.add( d );
                var maxLabelWidth = Math.max(maxLabelWidth, bbox.width+10);
                var maxLabelHeight = Math.max(maxLabelHeight, bbox.height+10);
            })
            .transition()//we can use transitions now!
            .attr("x", function (d) {
                return d.x;
            })
            .attr("y", function (d) {
                return d.y;
            });

        var pointers = pointerGroup.selectAll("path.pointer")
            .data(piedata);

        pointers.enter()
            .append("path")
            .attr("class", "pointer")
            .style("fill", "none")
            .style("stroke", "black")
            .attr("marker-end", "url(#circ)");
        pointers.exit().remove();

        pointers.transition().attr("d", function (d) {
            if (d.cx > d.l) {
                return "M" + (d.l+2) + "," + d.b + "L" + (d.r-2) + "," + d.b + " " + d.cx + "," + d.cy;
            } else {
                return "M" + (d.r-2) + "," + d.b + "L" + (d.l+2) + "," + d.b + " " + d.cx + "," + d.cy;
            }
        });

        oldPieData = piedata;
    };

    function link(scope, element, attr) {
        data.whenDataLoaded(function() {

            scope.svg = buildSvg(element[0]);

            scope.lang = function() {
                draw(scope.langdata, scope.svg, 'name', 'days', data.languageColors);
            };
            scope.tools = function() {
                draw(scope.tooldata, scope.svg, 'name', 'days', data.toolColors);
            };
            scope.onInit({interface:{open: scope.lang, tools: scope.tools}});

            draw(scope.langdata, scope.svg, 'name', 'days', data.languageColors);
        });

    }

    return {
        link: link,
        restrict: 'E',
        scope: {langdata: '=', tooldata: '=', jobnumber: '=', onInit : '&onInit'},
        template: "<form><ul class='select-donut'><li><input type='radio' ng-click='lang()' name='job{{jobnumber}}' id='langrad{{jobnumber}}' value='Languages' checked><label for='langrad{{jobnumber}}'>Languages</label></li><li><input type='radio'  ng-click='tools()'  name='job{{jobnumber}}'  id='toolrad{{jobnumber}}' value='Tools'/><label for='toolrad{{jobnumber}}'>Tools</label></li></ul></form>"
    };
});