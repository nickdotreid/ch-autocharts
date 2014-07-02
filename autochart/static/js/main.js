$(document).ready(function(){
	if(data){
		make_chart(data);
	}
});

function make_chart(data){
	y_axis_width = 100;
	x_axis_height = 100;
	barHeight = 20;

	canvas_width = 500
	canvas_height = barHeight*data.length;

	var chart = $("#chart");
	chart.width(y_axis_width+canvas_width);
	chart.height(canvas_height+x_axis_height);

	var color = d3.scale.category10();

	var svg = d3.select("#chart").append("svg:svg")
		.attr("width", chart.width())
		.attr("height", chart.height());

	yaxis = svg.append("g");
	xaxis = svg.append("g").attr("transform", function(){ return "translate(100,"+canvas_height+")"; })
	canvas = svg.append("g").attr("transform", "translate(100,0)");

	var x = d3.scale.linear().domain([
		d3.min(data, function(d){ 
			return d.low;
			 }),
		d3.max(data, function(d){ return d.high; })
		]).range([0,600]);

	ticks = x.ticks(5);
	xaxis.append("line").attr("x1",0).attr("x2",canvas_width).attr("y1",0).attr("y2",0).attr("stroke","black").attr("stroke-width","1");
	var tickMarks = xaxis.selectAll("g").data(ticks).enter().append("g").attr("transform", function(d){
		return "translate("+x(d)+",0)";
	});
	tickMarks.append("line").attr("x1",0).attr("x2",0).attr("y1",0).attr("y2",0-canvas_height).attr("stroke","black").attr("stroke-width","1");
	tickMarks.append("text").attr("x",0).attr("y",15).text(function(d){ return d; });

	var bar = canvas.selectAll("g").data(data).enter().append("g").attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; });

	bar.append("rect").attr("height",barHeight).attr("width",function(d){
		return x(d.percent)
	}).attr("fill", function(d){
		return color(d.name);
	});

	bar.append("text").text(function(d){
		return d.name;
	}).attr({
		"font-size":"10px",
		"font-family":"Arial",
	}).attr("x",function(){
		return -10-this.getBBox().width;
	}).attr("y",function(){
		return this.getBBox().height;
	})

	bar.append("line").attr("x1",function(d){
		return x(d.low);
	}).attr("x2", function(d){
		return x(d.high);
	}).attr("y1", barHeight/2).attr("y2",barHeight/2)
	.attr("stroke","black").attr("stroke-width","2");

	bar.append("line").attr("x1",function(d){
		return x(d.low);
	}).attr("x2", function(d){
		return x(d.low);
	}).attr("y1", (barHeight/2)-(barHeight/4)).attr("y2",(barHeight/2)+(barHeight/4))
	.attr("stroke","black").attr("stroke-width","2");
	
	bar.append("line").attr("x1",function(d){
		return x(d.high);
	}).attr("x2", function(d){
		return x(d.high);
	}).attr("y1", (barHeight/2)-(barHeight/4)).attr("y2",(barHeight/2)+(barHeight/4))
	.attr("stroke","black").attr("stroke-width","2");

	var svg = (new XMLSerializer).serializeToString($("svg")[0]);
	$("#svgform #id_svg").val(svg);
}