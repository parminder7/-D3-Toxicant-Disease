/**
 * Script File
 */

//Global variables
var currentURL, margin, layout_gravity, width, height, diameter, format, max_amount, padding, duration, delay, svg, node;

/**
 * This function executes when DOM is ready
 */
$( document ).ready(function() {
    currentURL ={
        domain:"AToxicants",
        specificData:""
    };
    location.hash = queryString.stringify(currentURL);

    margin = {top: 5, right: 0, bottom: 0, left: 0};

    //d3 svg
    layout_gravity = -0.01;

    width = 960,
        height = 960;
    diameter = 960,
        format = d3.format(",d");
    max_amount = 80;

    //color = d3.scale.category20c();
    padding = 2;

    duration = 1500;
    delay = 0;

    svg = d3.select("#graph").append("svg")
        .attr("width", diameter)
        .attr("height", diameter);

    node = d3.select('svg').append("g").attr("id", "bubble-nodes")
        .attr("transform", "translate("+margin.left+","+margin.top+")");

    node.append("rect")
        .attr("id", "bubble-background")
        .attr("width", width)
        .attr("height", height);

    $( "#selectRadio" ).buttonset();
    bindEvent();
    $.ajax({
        url: 'php/parseData.php',
        data:{
            action:"getToxicants"
        },
        success: function(response){
            if (response){
                try{
                    var result = JSON.parse(response);
                    appendCircles(result);
                    refreshSearchList(result.children);
                }catch(e){
                    console.log(e); //error
                }
            }

        }
    });
});

/**
 *
 * @param root
 * @returns {Array}
 */
function classes(root) {
    var dataNode = [];
    var max_range = 60;
    max_amount = d3.max(root.children, function(d) { return +d.size;} );
    if(max_amount < 5) max_range = 40;
    var radius_scale = d3.scale.pow().exponent(0.5).domain([0, max_amount]).range([2, max_range]);

    root.children.forEach(function(node){
        dataNode.push({packageName: name, className: node.name, value: node.size, id:node.id, r:radius_scale(node.size)});
    });

    return dataNode;
}

/**
 *
 * @param root
 */
function appendCircles(root){
    var color = d3.scale.linear().domain([0, max_amount]).range([0,8]);
    //calculating layout values
    var nodes = classes(root);
    var bubbleNode = node.selectAll("circle").data(nodes);
    // var label = d3.select("node")
    //             .append("div")
    //             .attr("id", "bubble-labels");
    var bubbleText = node.selectAll(".bubble-label").data(nodes);

    // update
    bubbleNode.attr('r', 0)
        .attr("id", function(d){ return d.id;})
        .attr('class','bubble-circle')
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .style("fill", function(d,i) {
            return colorbrewer.Spectral[9][Math.floor(color(d.r))];
        });

    // enter
    bubbleNode.enter()
        .append('circle')
        .attr('r', 0)
        .attr('class','bubble-circle bubble')
        .attr("id", function(d){ return d.id;})
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .style("fill", function(d,i) {
            return colorbrewer.Spectral[9][Math.floor(color(d.r))];

        });

    // exit
    bubbleNode.exit()
        .remove();

    bubbleNode.transition().duration(duration).attr("r", function(d){return d.r;});

    if(currentURL.specificData!=""){
        //bubbleText = label.selectAll(".bubble-label").data(nodes);

        bubbleText.text(function(d) {
            var circleName = d.className.substring(0, d.r / 3);
            return circleName;
        });

        bubbleText.enter()
            .append('a')
            .attr("class", "bubble-label  bubble")
            .attr("xlink:href", function(d){ return "https://www.google.ca/#q="+d.className;})
            .attr("target","_blank")
            .append('text')
            //.attr("dy", ".3em")
            .style("text-anchor", "middle")
            .attr("fill","black")
            .text(function(d) {
                var circleName = d.className.substring(0, Math.round(d.r / 3));
                return circleName;
            });
        bubbleText.exit().remove();
    }

    //tooltip  and event for circle
    var allCirlces = d3.selectAll('circle');
    var damper = 0.1;
    //**new
    //**new
    function tick(e) {
        bubbleNode.each(move_towards_center(e.alpha))
            .attr("transform", function(d){ return 'translate(' + d.x + ',' + d.y + ')';} );

        bubbleText.attr("transform", function(d){ return 'translate(' + (margin.left + d.x) + ',' + (margin.top + d.y)  + ')';} );
        // .style("left", function(d){ return (margin.left + d.x) - d.dx / 2 + "px"})
        // .style("top", function(d){ return (margin.top + d.y) - d.dy / 2 + "px"});
    }
    var force = d3.layout.force()
        .nodes(nodes)
        .size([width, height]);

    force.gravity(layout_gravity)
        .charge(charge())
        .friction(0.9)
        .on("tick", tick)
        .start();

    function charge(){
        return function(d){
            return  -Math.pow(d.r, 2.0) / 8;
        };
    }

    // Move nodes toward cluster focus.
    function move_towards_center(alpha) {
        return function (d) {
            var center = width/2;

            d.y += (center - d.y) *  (damper + 0.02)*alpha;
            d.x += (center - d.x) * (damper + 0.02)* alpha;
        };
    }

    allCirlces.on("click",function(d){
        currentURL = queryString.parse(location.hash);
        if(currentURL.specificData==""){
            currentURL.specificData =d.id;
            location.hash = queryString.stringify(currentURL);
            $.ajax({
                url: 'php/parseData.php',
                data:{
                    action:"fetchFromToxicant",
                    filter:d.id
                },
                success: function(response){
                    if (response){
                        try{
                            var result = JSON.parse(response);
                            console.log(result);
                            appendCircles(result);
                            refreshSearchList(result.children);
                            $("#graphTitle").text("Diseases realted to " +root.name);
                        }catch(e){
                            console.log(e); //error
                        }
                    }}
            });
        }
    });

    d3.selectAll('.bubble').each(function(d){
        var currentCircle = d3.select(this);
        var showText = d.className + ": " + format(d.value);
        $(currentCircle).qtip({
            content: {
                text:showText
            },
            position: {
                my: 'bottom left',
                at: 'top right'
            },
            style:{
                classes:'qtip-bootstrap'
            }
        });
    });
}

/**
 *
 * @param data
 */
function refreshSearchList(data){
    $('#bubbleFilter').empty();
    $.each(data, function(key, value) {
        $('#bubbleFilter')
            .append($("<option></option>")
                .attr("value",value.id)
                .text(value.name));
    });
    $('select').multipleSelect('refresh');
}

/**
 * NYI
 */
function checkboxFilters(){

}

/**
 *
 */
function bindEvent(){
    $(document).on("click","#checkall_dc",function(){
        if($(this).is(':checked')){
            $("input[name=dc]").each(function(){
                $(this).prop("checked",true);
            });
            $.ajax({
                url: 'php/parseData.php',
                data:{ action:"getToxicants" },
                success: function(response){
                    var result = JSON.parse(response);
                    appendCircles(result);
                    refreshSearchList(result.children); }
            });
        }else{
            $("input[name=dc]").each(function(){
                $(this).prop("checked",false);
            });
            var result = {name:"", children:[]};
            appendCircles(result);
            refreshSearchList(result.children);
        }
    });

    //send ajax request to php to request new set of toxicants data
    $(document).on("click","input[name=dc]",function(){
        if($(this).is(':checked')){

        }
    });

    $("#bubbleFilter").multipleSelect({
        filter: true,
        single: true
    });
}