// FROM:: http://stackoverflow.com/questions/1184624/convert-form-data-to-js-object-with-jquery
$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

$(document).ready(function(){
	$(".chart").each(function(){
		var chart = $(this);
		var form = $('form',chart.parents('.row'));
		make_chart(chart,data[chart.data("name")],form.serializeObject());
	});
});

function make_chart(div,data,settings){
	defaultSettings = {
		'width':650,
		'height':350,
		'min':false,
		'max':false,
		'ticks':6,
		'label':'',
	}
	if(!settings){
		settings = {};
	}
	for(name in defaultSettings){
		if(!settings[name] || settings[name]==""){
			settings[name] = defaultSettings[name];
		}
	}

	y_axis_width = 100;
	x_axis_height = 100;
	barHeight = 20;

	var canvas_width = 500

	var canvas_height = 0;
	var last_group = 0;
	for(d in data){
		if( last_group != d.group){
			canvas_height += barHeight;
			last_group = d.group;
		}
		canvas_height += barHeight;
	}
	canvas_height += barHeight; // padding at the bottom

	var chart = div
	chart.html("")
	chart.width(y_axis_width+canvas_width+10);
	chart.height(canvas_height+x_axis_height);

	var blueScale = d3.scale.ordinal().range(['rgb(198,219,239)','rgb(158,202,225)','rgb(107,174,214)','rgb(66,146,198)','rgb(33,113,181)','rgb(8,81,156)','rgb(8,48,107)']);
	var greenScale = d3.scale.ordinal().range(['rgb(199,233,192)','rgb(161,217,155)','rgb(116,196,118)','rgb(65,171,93)','rgb(35,139,69)','rgb(0,109,44)','rgb(0,68,27)']);
	var grayScale = d3.scale.ordinal().range(['rgb(217,217,217)','rgb(189,189,189)','rgb(150,150,150)','rgb(99,99,99)','rgb(37,37,37)']);
	var groupScales = d3.scale.ordinal().range([blueScale, greenScale]);
	var color = function(name, group){
		if(!group){
			return grayScale(name);
		}
		return groupScales(group)(name);
	}

	var svg = d3.select(chart[0]).append("svg:svg")
		.attr("width", chart.width())
		.attr("height", chart.height());

	axis = svg.append("g");
	canvas = svg.append("g").attr("transform", "translate(100,0)");

	var x = d3.scale.linear().domain([
		d3.min(data, function(d){ 
			return d.low;
			 }),
		d3.max(data, function(d){ return d.high; })
		]).range([0,canvas_width]);

	var ypos = 0;
	last_group = 0;
	var bar = canvas.selectAll("g").data(data).enter()
	.append("g")
	.attr("transform", function(d, i) {
		if(d.group != last_group){
			ypos += barHeight;
			last_group = d.group;
		}
		translate = "translate(0," + ypos + ")";
		ypos += barHeight;
		return translate; 
	});

	bar.append("rect").attr("height",barHeight).attr("width",function(d){
		return x(d.percent)
	}).attr("fill", function(d){
		return color(d.name, String(d.group));
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
	.attr("stroke","black").attr("stroke-width","1");

	bar.append("line").attr("x1",function(d){
		return x(d.low);
	}).attr("x2", function(d){
		return x(d.low);
	}).attr("y1", (barHeight/2)-(barHeight/4)).attr("y2",(barHeight/2)+(barHeight/4))
	.attr("stroke","black").attr("stroke-width","1");
	
	bar.append("line").attr("x1",function(d){
		return x(d.high);
	}).attr("x2", function(d){
		return x(d.high);
	}).attr("y1", (barHeight/2)-(barHeight/4)).attr("y2",(barHeight/2)+(barHeight/4))
	.attr("stroke","black").attr("stroke-width","1");


	ticks = x.ticks(6);
	axis.attr("transform", function(){ return "translate(100,"+ypos+")"; })
	axis.append("line").attr("x1",0).attr("x2",canvas_width).attr("y1",0).attr("y2",0).attr("stroke","gray").attr("stroke-width","1");
	var tickMarks = axis.selectAll("g").data(ticks).enter().append("g").attr("transform", function(d){
		return "translate("+x(d)+",0)";
	});
	tickMarks.append("line").attr("x1",0).attr("x2",0).attr("y1",0).attr("y2",0-ypos).attr("stroke","gray").attr("stroke-width","1");
	tickMarks.append("text").text(function(d){ return d; }).attr({
		"font-size":"10px",
		"font-family":"Arial",
	}).attr("x",function(){
		return 0-this.getBBox().width/2;
	}).attr("y",function(){
		return this.getBBox().height + 5;
	});

	var svg = (new XMLSerializer).serializeToString($("svg",div)[0]);
	$("#svgform #id_svg",chart.parents(".row")).val(svg);
}