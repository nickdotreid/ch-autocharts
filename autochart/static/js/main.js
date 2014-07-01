$(document).ready(function(){
	if(data){
		make_chart(data);
	}
});

function make_chart(data){
	var chart = $("#chart");
	chart.width(600);
	chart.height(300);

	var color = d3.scale.category10();

	var svg = d3.select("#chart").append("svg:svg")
		.attr("width", chart.width())
		.attr("height", chart.height());

	var x = d3.scale.linear().domain([
		d3.min(data, function(d){ 
			return d.low;
			 }),
		d3.max(data, function(d){ return d.high; })
		]).range([0,600]);

	barHeight = 20;

	var bar = svg.selectAll("g").data(data).enter().append("g").attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; });

	bar.append("rect").attr("height",barHeight).attr("width",function(d){
		return x(d.percent)
	}).attr("fill", function(d){
		return color(d.name);
	});

	var svg = (new XMLSerializer).serializeToString($("svg")[0]);
	$("#svgform #id_svg").val(svg);
}