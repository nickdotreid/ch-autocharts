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
		$('input[name=filename]',form).val(chart.data('name'));
		if(form.serializeObject()['formtype'] == 'vertical'){
			make_vertical_chart(chart,data[chart.data("name")],form.serializeObject());
		}else{
			make_chart(chart,data[chart.data("name")],form.serializeObject());
		}
		$('input',form).change(function(){
			if(form.serializeObject()['formtype'] == 'vertical'){
				make_vertical_chart(chart,data[chart.data("name")],form.serializeObject());
			}else{
				make_chart(chart,data[chart.data("name")],form.serializeObject());
			}
		});
	});
});

function make_chart(div,data,settings){
	defaultSettings = {
		'width':650,
		'height':350,
		'padding':5,
		'min':false,
		'max':false,
		'ticks':6,
		'barSize':20,
		'label':'',
		'target':false,
	}
	if(!settings){
		settings = {};
	}
	for(name in defaultSettings){
		if(!settings[name] || settings[name]==""){
			settings[name] = defaultSettings[name];
		}
	}

	var target = false;
	if(settings.target){
		var newData = []
		data.forEach(function(d){
			if(d.name == settings.target){
				target = d;
			}else{
				newData.push(d);
			}
		});
		data = newData;
	}

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

	var chart = div
	chart.html("")
	chart.width(settings.width);
	chart.height(settings.height);

	var svg = d3.select(chart[0]).append("svg:svg")
		.attr("width", chart.width())
		.attr("height", chart.height());

	axis = svg.append("g");
	canvas = svg.append("g").attr("transform", "translate(0,0)");

	// figure out y-axis width
	var ypos = 0;
	last_group = 0;
	var bars = canvas.selectAll("g").data(data).enter()
	.append("g");

	bars.append("text").text(function(d){
		return d.name;
	}).attr({
		"font-size":"10px",
		"font-family":"Arial",
		"font-style":"Bold",
	}).attr("x",function(){
		return -settings.padding-this.getBBox().width;
	}).attr("y",function(){
		return this.getBBox().height;
	});

	yAxisWidth = d3.max(bars[0],function(d){
		return d.children[0].getBBox().width;
	});

	chartWidth = settings.width - yAxisWidth - settings.padding - settings.padding;
	
	if(!settings.min){
		settings.min = d3.min(data, function(d){ 
			if(d.low) return d.low;
			return d.value;
		});
	}
	if(!settings.max){
		settings.max = d3.max(data, function(d){
			if(d.high) return d.high;
			return d.value;
		});
	}
	var x = d3.scale.linear().domain([
		settings.min,
		settings.max
		]).range([0,chartWidth]);

	// figure out x-axis height
	ticks = x.ticks(settings.ticks);
	axis.append("line").attr("x1",0).attr("x2",chartWidth).attr("y1",0).attr("y2",0).attr("stroke","gray").attr("stroke-width","1");
	var tickMarks = axis.selectAll("g").data(ticks).enter().append("g").attr("transform", function(d){
		return "translate("+x(d)+",0)";
	});
	tickMarks.append("text").text(function(d){ return d; }).attr({
		"font-size":"10px",
		"font-family":"Arial",
	}).attr("x",function(){
		return 0-this.getBBox().width/2;
	}).attr("y",function(){
		return this.getBBox().height + 5;
	});

	// find tallest tick
	var tickHeight = d3.max(tickMarks[0],function(d){
		return d.children[0].getBBox().height;
	})

	var chartHeight = settings.height - tickHeight - settings.padding

	if(settings.label){
		axis.append("text").text(settings.label)
		.attr({
			"font-size":"12px",
			"font-family":"Arial",
		}).attr("y",function(){
			chartHeight = chartHeight - this.getBBox().height - settings.padding;
			return this.getBBox().height + settings.padding + tickHeight +settings.padding;
		}).attr("x",function(){
			return chartWidth/2 - (this.getBBox().width/2);
		});
	}

	axis.attr("transform", function(){ return "translate("+yAxisWidth+","+chartHeight+")"; });
	tickMarks.append("line").attr("x1",0).attr("x2",0).attr("y1",0).attr("y2",0-chartHeight).attr("stroke","gray").attr("stroke-width","1");

	if(target){
		var targetPos = x(target.value);
		canvas.append("text").text(target.name).attr({
			"font-size":"10px",
			"font-family":"Arial",
		}).attr("x", function(){
			return targetPos+settings.padding;
		}).attr("y",function(){
			return this.getBBox().height;
		});
		axis.append("line").attr({
			"x1":targetPos,
			"x2":targetPos,
			"y1":0,
			"y2":0-chartHeight,
		}).attr("stroke","black").attr("stroke-width","1").attr("stroke-dasharray","4,2");

	}

	var steps = 0;
	last_group = 0;
	data.forEach(function(d){
		if(d.group != last_group){
			last_group = d.group;
			steps += 1;
		}
		steps +=1;
	});
	steps += 1; // space at bottom

	barHeight = chartHeight/steps;
	if(barHeight > settings.barSize){
		barHeight = settings.barSize;
	}

	last_group = 0;
	ypos = 0;
	bars.attr("transform",function(d){
		if(d.group != last_group){
			last_group = d.group;
			ypos += barHeight;
		}
		var translate = "translate(0,"+ypos+")";
		ypos += barHeight;
		return translate;
	}).append("rect").attr("height",barHeight).attr("width",function(d){
		return x(d.value)
	}).attr("fill", function(d){
		return color(d.name, String(d.group));
	});

	if(true){ // draw error margins if there is data
		bars.append("line").attr("x1",function(d){
			return x(d.low);
		}).attr("x2", function(d){
			return x(d.high);
		}).attr("y1", barHeight/2).attr("y2",barHeight/2)
		.attr("stroke","black").attr("stroke-width","1");

		bars.append("line").attr("x1",function(d){
			return x(d.low);
		}).attr("x2", function(d){
			return x(d.low);
		}).attr("y1", (barHeight/2)-(barHeight/4)).attr("y2",(barHeight/2)+(barHeight/4))
		.attr("stroke","black").attr("stroke-width","1");
		
		bars.append("line").attr("x1",function(d){
			return x(d.high);
		}).attr("x2", function(d){
			return x(d.high);
		}).attr("y1", (barHeight/2)-(barHeight/4)).attr("y2",(barHeight/2)+(barHeight/4))
		.attr("stroke","black").attr("stroke-width","1");
	}

	canvas.attr("transform", "translate("+yAxisWidth+","+(chartHeight - ypos -barHeight )+")");

	var svg = (new XMLSerializer).serializeToString($("svg",div)[0]);
	$("#svgform #id_svg",chart.parents(".row")).val(svg);
}


function make_vertical_chart(div,data,settings){
	defaultSettings = {
		'width':650,
		'height':350,
		'padding':5,
		'min':false,
		'max':false,
		'ticks':6,
		'barSize':20,
		'label':'',
		'target':false,
	}
	if(!settings){
		settings = {};
	}
	for(name in defaultSettings){
		if(!settings[name] || settings[name]==""){
			settings[name] = defaultSettings[name];
		}
	}

	var target = false;
	if(settings.target){
		var newData = []
		data.forEach(function(d){
			if(d.name == settings.target){
				target = d;
			}else{
				newData.push(d);
			}
		});
		data = newData;
	}

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

	var chart = div
	chart.html("")
	chart.width(settings.width);
	chart.height(settings.height);

	var svg = d3.select(chart[0]).append("svg:svg")
		.attr("width", chart.width())
		.attr("height", chart.height());

	yaxis = svg.append("g");
	axis = svg.append("g");
	canvas = svg.append("g").attr("transform", "translate(0,0)");

	// figure out y-axis width
	// Add label
	if(settings.label){
		yaxis.append("text").text(settings.label)
		.attr({
			"font-size":"12px",
			"font-family":"Arial",
		}).attr("transform","rotate(270)")
		.attr({
			"x":function(){
				return 0 - settings.height/2 - this.getBBox().width/2;
			},
			"y":function(){
				return settings.padding + this.getBBox().height;
			},
		});
	}
	// Make ticks



	var ypos = 0;
	last_group = 0;
	var bars = canvas.selectAll("g").data(data).enter()
	.append("g");

	bars.append("text").text(function(d){
		return d.name;
	}).attr({
		"font-size":"10px",
		"font-family":"Arial",
		"font-style":"Bold",
	}).attr("x",function(){
		return -settings.padding-this.getBBox().width;
	}).attr("y",function(){
		return this.getBBox().height;
	});

	yAxisWidth = d3.max(bars[0],function(d){
		return d.children[0].getBBox().width;
	});

	chartWidth = settings.width - yAxisWidth - settings.padding - settings.padding;
	
	if(!settings.min){
		settings.min = d3.min(data, function(d){ return d.low; });
	}
	if(!settings.max){
		settings.max = d3.max(data, function(d){ return d.high; });
	}
	var x = d3.scale.linear().domain([
		settings.min,
		settings.max
		]).range([0,chartWidth]);

	// figure out x-axis height
	ticks = x.ticks(settings.ticks);
	axis.append("line").attr("x1",0).attr("x2",chartWidth).attr("y1",0).attr("y2",0).attr("stroke","gray").attr("stroke-width","1");
	var tickMarks = axis.selectAll("g").data(ticks).enter().append("g").attr("transform", function(d){
		return "translate("+x(d)+",0)";
	});
	tickMarks.append("text").text(function(d){ return d; }).attr({
		"font-size":"10px",
		"font-family":"Arial",
	}).attr("x",function(){
		return 0-this.getBBox().width/2;
	}).attr("y",function(){
		return this.getBBox().height + 5;
	});

	// find tallest tick
	var tickHeight = d3.max(tickMarks[0],function(d){
		return d.children[0].getBBox().height;
	})

	var chartHeight = settings.height - tickHeight - settings.padding

	axis.attr("transform", function(){ return "translate("+yAxisWidth+","+chartHeight+")"; });
	tickMarks.append("line").attr("x1",0).attr("x2",0).attr("y1",0).attr("y2",0-chartHeight).attr("stroke","gray").attr("stroke-width","1");

	if(target){
		var targetPos = x(target.percent);
		canvas.append("text").text(target.name).attr({
			"font-size":"10px",
			"font-family":"Arial",
		}).attr("x", function(){
			return targetPos+settings.padding;
		}).attr("y",function(){
			return this.getBBox().height;
		});
		axis.append("line").attr({
			"x1":targetPos,
			"x2":targetPos,
			"y1":0,
			"y2":0-chartHeight,
		}).attr("stroke","black").attr("stroke-width","1").attr("stroke-dasharray","4,2");

	}

	var steps = 0;
	last_group = 0;
	data.forEach(function(d){
		if(d.group != last_group){
			last_group = d.group;
			steps += 1;
		}
		steps +=1;
	});
	steps += 1; // space at bottom

	barHeight = chartHeight/steps;
	if(barHeight > settings.barSize){
		barHeight = settings.barSize;
	}

	last_group = 0;
	ypos = 0;
	bars.attr("transform",function(d){
		if(d.group != last_group){
			last_group = d.group;
			ypos += barHeight;
		}
		var translate = "translate(0,"+ypos+")";
		ypos += barHeight;
		return translate;
	}).append("rect").attr("height",barHeight).attr("width",function(d){
		return x(d.percent)
	}).attr("fill", function(d){
		return color(d.name, String(d.group));
	});	
	bars.append("line").attr("x1",function(d){
		return x(d.low);
	}).attr("x2", function(d){
		return x(d.high);
	}).attr("y1", barHeight/2).attr("y2",barHeight/2)
	.attr("stroke","black").attr("stroke-width","1");

	bars.append("line").attr("x1",function(d){
		return x(d.low);
	}).attr("x2", function(d){
		return x(d.low);
	}).attr("y1", (barHeight/2)-(barHeight/4)).attr("y2",(barHeight/2)+(barHeight/4))
	.attr("stroke","black").attr("stroke-width","1");
	
	bars.append("line").attr("x1",function(d){
		return x(d.high);
	}).attr("x2", function(d){
		return x(d.high);
	}).attr("y1", (barHeight/2)-(barHeight/4)).attr("y2",(barHeight/2)+(barHeight/4))
	.attr("stroke","black").attr("stroke-width","1");

	canvas.attr("transform", "translate("+yAxisWidth+","+(chartHeight - ypos -barHeight )+")");

	var svg = (new XMLSerializer).serializeToString($("svg",div)[0]);
	$("#svgform #id_svg",chart.parents(".row")).val(svg);
}