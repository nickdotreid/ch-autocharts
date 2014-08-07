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
	$('form.download-all').submit(function(event){
		var form = $(this);
		$('input[type=hidden]:not([name=csrfmiddlewaretoken])',form).remove();

		$('form:not(.download-all)').each(function(){
			var obj = $(this).serializeObject();
			var input = $('<input type="hidden" />').appendTo(form);
			input.attr('name',obj['filename']);
			input.attr('value',obj['svg']);
		});
	});

	$(".chart").each(function(){
		var chart = $(this);
		var form = $('form',chart.parents('.row'));
		$('input[name=filename]',form).val(chart.data('name'));
		if(form.serializeObject()['formtype'] == 'vertical'){
			make_vertical_chart(chart,data[chart.data("name")],form.serializeObject());
		}else{
			make_chart(chart,data[chart.data("name")],form.serializeObject());
		}
		$('input, select',form).change(function(){
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
		'width':680,
		'height':350,
		'padding':5,
		'padding-top':0,
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

	if(typeof settings.labels == 'string') settings.labels = [settings.labels];

	for(name in defaultSettings){
		if(!settings[name] || settings[name]==""){
			settings[name] = defaultSettings[name];
		}
	}

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

	var nameProperty = "name";
	if(settings.labels && settings.labels.length > 1){
		nameProperty = "label";
	}

	var names = [];
	data.forEach(function(d){
		if(names.indexOf(d[nameProperty]) == -1){
			names.push(d[nameProperty]);
		}
	});

	var chart = div
	chart.html("")
	chart.width(settings.width);
	chart.height(settings.height);

	var svg = d3.select(chart[0]).append("svg:svg")
		.attr("width", chart.width())
		.attr("height", chart.height());

	var defs = svg.append("svg:defs");
	function makeGradient(color){
		var gradientName = 'gradient'+color.replace("#",'');
		var gradient = defs.append("svg:linearGradient")
		.attr("id", gradientName)
		.attr("x1", "0%")
		.attr("y1", "0%")
		.attr("x2", "0%")
		.attr("y2", "100%")
		.attr("spreadMethod", "pad");

		gradient.append("svg:stop")
		    .attr("offset", "0%")
		    .attr("stop-color", color)
		    .attr("stop-opacity", 1);
		gradient.append("svg:stop")
		    .attr("offset", "50%")
		    .attr("stop-color", d3.rgb(color).brighter().toString())
		    .attr("stop-opacity", 1);
		gradient.append("svg:stop")
		    .attr("offset", "100%")
		    .attr("stop-color", color)
		    .attr("stop-opacity", 1);
		return 'url(#'+gradientName+')';
	}

	var blues = ['#0b4f7d','#739bc5','#326ea4','#1b426e','#407199'];
	var greens = ['#256a57','#629e77','#2e7c67','#0e4a3b','#629e77','#1d5d4c'];

	if(settings.labels.length > 1){
		var newScale = [];
		var mixColors = function(colorArrays){
			shortest = d3.min(colorArrays, function(d){
				return d.length;
			});
			var newArr = [];
			for(var i=0; i < shortest; i++){
				colorArrays.forEach(function(d){
					newArr.push(d[i]);
				});
			}
			return newArr;
		}
		var groupScales = d3.scale.ordinal().range([
			d3.scale.ordinal().range(mixColors([greens,blues]).map(makeGradient))
			]);
	}else{
		var blueScale = d3.scale.ordinal().range(blues.map(makeGradient));
		var greenScale = d3.scale.ordinal().range(greens.map(makeGradient));
		var groupScales = d3.scale.ordinal().range([greenScale, blueScale]);
	}

	var grayScale = d3.scale.ordinal().range(['#999999'].map(makeGradient));
	var color = function(name, group){
		if(!group || name.toLowerCase() == 'total'){
			return grayScale(name);
		}
		return groupScales(group)(name);
	}

	var axis = svg.append("g");
	var canvas = svg.append("g").attr("transform", "translate(0,0)");
	var yAxis = canvas.append("g").attr("class","yaxis");


	// Make y-axis
	var yAxisLabels = yAxis.selectAll("text").data(names).enter()
	.append("text").text(function(d){
		return d;
	}).style({
		"font-size":"10px",
		"font-family":"Arial",
		"font-weight":"Bold",
	}).attr("text-anchor","end")
	.attr("x",function(){
		return -settings.padding;
	}).attr("y",function(){
		return this.getBBox().height;
	});

	yAxisWidth = d3.max(yAxisLabels[0],function(d){
		return d.getBBox().width;
	});
	yAxisWidth += settings.padding;

	var chartWidth = settings.width - yAxisWidth - settings.padding;

	var ypos = 0;
	last_group = 0;
	var bars = canvas.selectAll("g.bar").data(data).enter()
	.append("g").attr("class","bar");
	
	var x = d3.scale.linear().domain([
		settings.min,
		settings.max
		]).range([0,chartWidth]);

	// figure out x-axis height
	ticks = x.ticks(settings.ticks);
	axis.append("line").attr("x1",0).attr("x2",chartWidth).attr("y1",0).attr("y2",0).attr("stroke","black").attr("stroke-width","1");
	var tickMarks = axis.selectAll("g").data(ticks).enter().append("g").attr("transform", function(d){
		return "translate("+x(d)+",0)";
	});

	var tickMarksHidden = false;
	if(settings.ticks > 10){
		tickMarksHidden = true;
	}
	var tickVisible = true;

	tickMarks.append("text").text(function(d){ 
		var text = d;
		if(!tickVisible){
			text = "";
		}
		if(tickMarksHidden){
			tickVisible = !tickVisible;
		}
		return text;
	}).style({
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

	var xAxisHeight = tickHeight + settings.padding;

	if(settings.labels.length > 1){
		var rectWidth = 35;
		var rectHeight = 20;

		var label_canvas = svg.append("g");
		var labels = label_canvas.selectAll("g").data(settings.labels).enter().append("g");
		labels.append("rect").attr({
			"x":0,
			"y":0,
			"width":rectWidth,
			"height":rectHeight,
			fill:function(d){
				return color(d,"1");
			}
		})
		labels.append("text").text(function(d){ return d; })
		.style({
			"font-size":"12px",
			"font-family":"Arial",
		})
		.attr("y", function(){
			return rectHeight/2 + this.getBBox().height/4;
		}).attr("x",function(){
			return settings.padding + rectWidth;
		});

		var xpos = 0;
		var ypos = 0;
		labels.attr("transform",function(d){
			var labelWidth = this.getBBox().width + settings.padding*2
			if(xpos + labelWidth > chartWidth){
				xpos = 0;
				ypos += rectHeight + settings.padding*2;
			}
			var translate = "translate("+xpos+","+ypos+")";
			xpos += labelWidth;
			return translate;
		});

		label_canvas.attr("transform",function(){
			var xpos = settings.width/2 - this.getBBox().width/2
			var ypos = settings.height - settings.padding - this.getBBox().height;
			xAxisHeight += settings.padding*2 + this.getBBox().height
			return "translate("+xpos+","+ypos+")";
		});
	}

	var chartHeight = settings.height - xAxisHeight;

	if(settings.label){
		axis.append("text").text(settings.label)
		.style({
			"font-size":"12px",
			"font-family":"Arial",
			"font-weight":"bold",
		}).attr("y",function(){
			chartHeight = chartHeight - this.getBBox().height - settings.padding;
			return this.getBBox().height + settings.padding + tickHeight +settings.padding;
		}).attr("x",function(){
			return chartWidth/2 - (this.getBBox().width/2);
		});
	}

	axis.attr("transform", function(){ return "translate("+yAxisWidth+","+chartHeight+")"; });
	tickMarks.append("line").attr("x1",0).attr("x2",0).attr("y1",0).attr("y2",0-chartHeight)
	.attr("stroke",function(d){
		if(d == settings.min) return "black";
		return "gray";
	})
	.attr("stroke-width",function(d){
		if(d == settings.min) return "0";
		return "1";
	});

	var steps = 0;
	last_group = 0;
	last_name = data[0].name;
	data.forEach(function(d){
		if(d.group != last_group){
			last_group = d.group;
			steps += 1;
		}
		if(settings.labels && settings.labels.length > 1 && d.name != last_name){
			last_name = d.name;
			steps += 1;
		}
		steps +=1;
	});
	steps += 1; // space at bottom

	barHeight = chartHeight/steps;
	if(barHeight > settings.barSize){
		barHeight = settings.barSize;
	}

	var nameLocations = {};

	last_name = data[0].name;
	last_group = 0;
	ypos = 0;
	bars.attr("transform",function(d){
		if(d.group != last_group){
			last_group = d.group;
			ypos += barHeight;
		}
		if(settings.labels && settings.labels.length > 1 && d.name != last_name){
			last_name = d.name;
			ypos += barHeight;
		}
		var translate = "translate(0,"+ypos+")";
		if(!nameLocations[d[nameProperty]]) nameLocations[d[nameProperty]] = {'start':ypos };
		
		ypos += barHeight;

		nameLocations[d[nameProperty]]['end'] = ypos;
		nameLocations[d[nameProperty]]['width'] = nameLocations[d[nameProperty]]['end'] - nameLocations[d[nameProperty]]['start'];
		nameLocations[d[nameProperty]]['middle'] = nameLocations[d[nameProperty]]['start'] + nameLocations[d[nameProperty]]['width']/2;

		return translate;
	}).append("rect").attr("height",barHeight).attr("width",function(d){
		return x(d.value)
	}).attr("fill", function(d){
			if(settings.labels.length > 1){
				return 	color(d.label,String(names.indexOf(d.name)));
			}
			return color(d.name, d.group);
	});

	yAxisLabels.attr("y", function(d){
		return nameLocations[d]['middle'] - this.getBBox().height/4;
	});


	bars.each(function(d){
		var bar = d3.select(this);
		if(d.label == settings.target) return;
		if(!d.low || !d.high) return;

		function getLow(d){
			return x(d.low);
		}
		function getHigh(d){
			return x(d.high);
		}

		var middle = barHeight/2;
		var x1 = middle - barHeight/4;
		var x2 = middle + barHeight/4;

		bar.append("line").attr("x1",getLow).attr("x2",getHigh).attr("y1", middle).attr("y2",middle)
		.attr("stroke","black").attr("stroke-width","1");

		bar.append("line").attr("x1",getLow).attr("x2",getLow).attr("y1", x1).attr("y2",x2)
		.attr("stroke","black").attr("stroke-width","1");
		
		bar.append("line").attr("x1",getHigh).attr("x2",getHigh).attr("y1", x1).attr("y2",x2)
		.attr("stroke","black").attr("stroke-width","1");
	});

	chartHeight = ypos + barHeight;

	if(target){
		var targetPos = x(target.value);
		canvas.append("text").text(target.name).style({
			"font-size":"15px",
			"font-family":"Arial",
			"font-weight":"bold",
		}).attr("x", function(){
			return targetPos+settings.padding;
		}).attr("y",function(){
			settings['padding-top'] = this.getBBox().height+settings.padding;
			return 0-settings.padding;
		});
		axis.append("line").attr({
			"x1":targetPos,
			"x2":targetPos,
			"y1":0,
			"y2":0-chartHeight,
		}).attr("stroke","black").attr("stroke-width","3").attr("stroke-dasharray","4,2");

	}

	axis.attr("transform", "translate("+yAxisWidth+","+ (chartHeight + settings['padding-top']) +")");
	tickMarks.selectAll("line").attr("y2", (0-chartHeight));

	// add y-axis line
	svg.append("line").attr("x1",yAxisWidth).attr("x2",yAxisWidth).attr("y1",settings['padding-top']).attr("y2",(chartHeight + settings['padding-top']))
	.attr("stroke","black")
	.attr("stroke-width","1");

	canvas.attr("transform", "translate("+yAxisWidth+","+settings['padding-top']+")");

	var svg = (new XMLSerializer).serializeToString($("svg",div)[0]);
	$("#svgform #id_svg",chart.parents(".row")).val(svg);
}


function make_vertical_chart(div,data,settings){
	if(data.length < 1){
		return ;
	}
	defaultSettings = {
		'width':680,
		'height':350,
		'padding':5,
		'min':false,
		'max':false,
		'ticks':6,
		'barSize':20,
		'label':'',
		'target':false,
		'labels':[],
	}
	if(!settings){
		settings = {};
	}
	for(name in defaultSettings){
		if(!settings[name] || settings[name]==""){
			settings[name] = defaultSettings[name];
		}
	}

	if(settings.labels && typeof settings.labels == "string"){
		settings.labels = [settings.labels];
	}

	if(!settings.min){
		settings.min = d3.min(data, function(d){ if(d.low) return d.low; return d.value; });
	}
	if(!settings.max){
		settings.max = d3.max(data, function(d){ if(d.high) return d.high; return d.value; });
	}

	var target = false;

	var newData = []
	data.forEach(function(d){
		if(settings.target && (d.name == settings.target)){
			target = d;
		}else if(settings.target && settings.labels.indexOf(d.label)==-1 && d.label == settings.target){
			target = d;
			target.name = d.label;
		}else if(settings.labels.indexOf(d.label) >= 0){
			newData.push(d);
		}
	});
	data = newData;

	var chart = div
	chart.html("")
	chart.width(settings.width);
	chart.height(settings.height);

	var svg = d3.select(chart[0]).append("svg:svg")
		.attr("width", chart.width())
		.attr("height", chart.height());

	var defs = svg.append("svg:defs");
	function makeGradient(color){
		var gradientName = 'gradient'+color.replace("#",'');
		var gradient = defs.append("svg:linearGradient")
		.attr("id", gradientName);

		gradient.append("svg:stop")
		    .attr("offset", "0%")
		    .attr("stop-color", color)
		    .attr("stop-opacity", 1);
		gradient.append("svg:stop")
		    .attr("offset", "50%")
		    .attr("stop-color", d3.rgb(color).brighter().toString())
		    .attr("stop-opacity", 1);
		gradient.append("svg:stop")
		    .attr("offset", "100%")
		    .attr("stop-color", color)
		    .attr("stop-opacity", 1);
		return 'url(#'+gradientName+')';
	}

	var blueScale = d3.scale.ordinal().range(['#0b4f7d','#739bc5','#326ea4','#1b426e','#407199'].map(makeGradient));
	var grayScale = d3.scale.ordinal().range(['#999999'].map(makeGradient));
	var groupScales = d3.scale.ordinal().range([blueScale]);
	var color = function(name, group){
		if(!group || name == settings.target){
			return grayScale(name);
		}
		return groupScales(group)(name);
	}

	yaxis = svg.append("g");
	axis = svg.append("g");
	canvas = svg.append("g").attr("transform", "translate(0,0)");
	barsContainer = canvas.append("g");

	// figure out y-axis width
	// Add label
	var label = false;
	var yAxisWidth = settings.padding+0;
	if(settings.label){
		label = yaxis.append("text").text(settings.label)
		.attr({
			"font-size":"12px",
			"font-family":"Arial",
		}).attr("transform","rotate(270)")
		.attr({
			"x":function(){
				return 0 - settings.height/2 - this.getBBox().width/2;
			},
			"y":function(){
				yAxisWidth += this.getBBox().height + settings.padding;
				return settings.padding + this.getBBox().height;
			},
		});
	}
	// Make ticks
	var y = d3.scale.linear().domain([settings.min,settings.max]);
	var ticks = y.ticks(settings.ticks);

	var tickMarks = yaxis.selectAll("g").data(ticks).enter().append("g");
	var tickMarksHidden = false;
	if(settings.ticks > 10){
		tickMarksHidden = true;
	}
	var tickVisible = true;
	tickMarks.append("text").text(function(d){ 
		var text = d;
		if(!tickVisible){
			text = "";
		}
		if(tickMarksHidden){
			tickVisible = !tickVisible;
		}
		return text;
	}).attr({
		"font-size":"10px",
		"font-family":"Arial",
	}).attr("y",function(){
		return this.getBBox().height/4;
	});
	// find widest tick
	var tickWidth = d3.max(tickMarks[0],function(d){
		return d.children[0].getBBox().width;
	});
	yAxisWidth += tickWidth + settings.padding;

	tickMarks.selectAll("text").attr("x",function(){
		return yAxisWidth - settings.padding;
	}).attr("text-anchor","end");

	chartWidth = settings.width - yAxisWidth - settings.padding;
	xAxisHeight = 0+settings.padding;

	// add target line
	if(target){
		var targetLine = canvas.append("g");		
		targetLine.append("text").text(target.name).style({
			"font-size":"15px",
			"font-family":"Arial",
			"font-weight":"bold",
		}).attr("x", function(){
			chartWidth = chartWidth - this.getBBox().width - settings.padding;
			return chartWidth + settings.padding;
		}).attr("y",function(){
			return this.getBBox().height/4;
		});
		targetLine.append("line").attr({
			"x1":0,
			"x2":chartWidth,
			"y1":0,
			"y2":0,
		}).attr("stroke","black").attr("stroke-width","3").attr("stroke-dasharray","4,2");
	}

	// figure out bar width
	var steps = 0;
	last_group = 0;
	last_name = data[0].name;
	data.forEach(function(d){
		if(d.group != last_group){
			last_group = d.group;
			steps += 1;
		}
		if(settings.labels.length > 1 && d.name != last_name){
			last_name = d.name;
			steps += 1;
		}
		steps +=1;
	});
	steps += 1; // space at bottom

	barWidth = chartWidth/steps;
	if(barWidth > settings.barSize){
//		barWidth = settings.barSize;
	}

	var names = [];
	data.forEach(function(d){
		if(names.indexOf(d.name) == -1){
			names.push(d.name);
		}
	});
	var nameLocations = {}; // oh this is ugly....

	// draw bar/grouping labels
	var xpos = 0;
	last_group = 0;
	last_name = data[0].name;
	var bars = barsContainer.selectAll("g").data(data).enter()
	.append("g").attr("transform",function(d){
		if(d.group != last_group){
			last_group = d.group;
			xpos += barWidth;
		}
		if(settings.labels.length > 1 && d.name != last_name){
			last_name = d.name;
			xpos += barWidth;
		}
		if(!nameLocations[d.name]) nameLocations[d.name] = {'start':xpos };
		var translate = "translate("+(xpos+barWidth/2)+",0)";
		xpos += barWidth;
		nameLocations[d.name]['end'] = xpos;
		nameLocations[d.name]['width'] = nameLocations[d.name]['end'] - nameLocations[d.name]['start'];
		nameLocations[d.name]['middle'] = nameLocations[d.name]['start'] + nameLocations[d.name]['width']/2;
		return translate;
	}).attr("data-name",function(d){ return d.name; })
	.attr("data-label",function(d){ return d.label; });

	var nameLabels = [[]];
	if(settings.labels.length > 1){
		labelContainer = canvas.append("g");
		nameLabels = labelContainer.selectAll("text").data(names).enter()
		.append("text").text(function(d){
			return d;
		}).attr("text-anchor","middle")
		.style({
			"font-size":"10px",
			"font-family":"Arial",
			"font-weight":"Bold",
		}).attr("x",function(d){
			return nameLocations[d]['middle'];
		}).attr("width",function(d){
			return nameLocations[d]['width'];
		}).attr("y",function(){
			return this.getBBox().height;
		})
		nameLabels.call(wrap);
	}else{
		nameLabels = bars.append("text").text(function(d){
			return d.name;
		}).style({
			"font-size":"10px",
			"font-family":"Arial",
			"font-weight":"Bold",
		}).attr("x",function(){
			return -this.getBBox().width/2;
		}).attr("y",function(d){
			return settings.padding + this.getBBox().height;
		});
	}

	// get tallest label
	var barNameHeight = d3.max(nameLabels[0], function(d){
		if(!d) return;
		return d.getBBox().height;
	});
	xAxisHeight += barNameHeight + settings.padding;

	if(settings['labels-label']){
		// Add secondary label and resize
	}

	if(settings.labels.length > 1){
		var rectWidth = 35;
		var rectHeight = 20;

		var label_canvas = svg.append("g");
		var labels = label_canvas.selectAll("g").data(settings.labels).enter().append("g");
		labels.append("rect").attr({
			"x":0,
			"y":0,
			"width":rectWidth,
			"height":rectHeight,
			fill:function(d){
				return color(d,"1");
			},
			'stroke':'#808080',
			'stroke-dasharray':"4,2",
			'stroke-width':function(d){
				if(d == settings.target) return 2;
				return 0;
			}
		})
		labels.append("text").text(function(d){ return d; })
		.style({
			"font-size":"12px",
			"font-family":"Arial",
		})
		.attr("y", function(){
			return rectHeight/2 + this.getBBox().height/4;
		}).attr("x",function(){
			return settings.padding + rectWidth;
		});

		var xpos = 0;
		labels.attr("transform",function(d){
			var translate = "translate("+xpos+",0)";
			xpos += this.getBBox().width + settings.padding*2;
			return translate;
		});

		label_canvas.attr("transform",function(){
			var xpos = settings.width/2 - this.getBBox().width/2
			var ypos = settings.height - settings.padding - this.getBBox().height;
			xAxisHeight += settings.padding*2 + this.getBBox().height
			return "translate("+xpos+","+ypos+")";
		});
	}


	var chartHeight = settings.height - xAxisHeight;

	// translate canvas down
	canvas.attr("transform","translate("+yAxisWidth+","+chartHeight+")")

	// move y-axis label down
	label.attr("text-anchor","middle").attr("x",function(){
		return 0-chartHeight/2;
	});
	
	//Set Range
	y.range(
		[0,chartHeight]
		);

	if(target){
		targetLine.attr("transform", "translate(0,"+(0 - y(target.value))+")");
	}

	// Move ticks
	tickMarks.attr("transform",function(d){
		return "translate(0,"+(chartHeight-y(d))+")";
	});
	tickMarks.append("line").attr({
		"x1":yAxisWidth+chartWidth,
		"x2":yAxisWidth,
		"y1":0,
		"y2":0,
	}).attr("stroke","gray").attr("stroke-width",function(d){
		if(d == settings.min) return "0";
		return "1";
	});

	// Add Bars
	bars.append("rect").attr({
		'x':(0-barWidth/2),
		'width':barWidth,
		'y':function(d){
			return 0-y(d.value);
		},
		'height':function(d){
			return y(d.value);
		},
		'fill':function(d){
			if(settings.labels.length > 1){
				return 	color(d.label,"1");
			}
			return color(d.name, d.group);
		},
		'stroke':'#808080',
		'stroke-dasharray':"4,2",
		'stroke-width':function(d){
			if(d.label == settings.target) return 2;
			return 0;
		}
	});

	bars.each(function(d){
		var bar = d3.select(this);
		if(d.label == settings.target) return;
		if(!d.low || !d.high) return;

		function getLow(d){
			return 0 - y(d.low);
		}
		function getHigh(d){
			return 0 - y(d.high);
		}

		var middle = 0;
		var x1 = middle - barWidth/4;
		var x2 = middle + barWidth/4;

		bar.append("line").attr("y1",getLow).attr("y2",getHigh).attr("x1", middle).attr("x2",middle)
		.attr("stroke","black").attr("stroke-width","1");

		bar.append("line").attr("y1",getLow).attr("y2",getLow).attr("x1", x1).attr("x2",x2)
		.attr("stroke","black").attr("stroke-width","1");
		
		bar.append("line").attr("y1",getHigh).attr("y2",getHigh).attr("x1", x1).attr("x2",x2)
		.attr("stroke","black").attr("stroke-width","1");
	});

	// Add axis lines to bottom of chart so its above rectangles
	canvas.append("line").attr("x1",0).attr("x2",chartWidth).attr("y1",0).attr("y2",0).attr("stroke","black").attr("stroke-width","1");
	canvas.append("line").attr("x1",0).attr("x2",0).attr("y1",0).attr("y2",0-chartHeight).attr("stroke","black").attr("stroke-width","1");

	var svg = (new XMLSerializer).serializeToString($("svg",div)[0]);
	$("#svgform #id_svg",chart.parents(".row")).val(svg);
}


// Modified FROM: http://bl.ocks.org/mbostock/7555321
function wrap(text) {
  text.each(function() {
    var text = d3.select(this),
    	width = text.attr("width"),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        offset = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        x = text.attr("x"),
        tspan = text.text(null).append("tspan").attr("x", x).attr("y", y);
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").text(word).attr("x", x).attr("y", y).attr("dy", function(){
        	var rect = this.getBoundingClientRect();
        	var height = Math.abs(rect.top - rect.bottom);
        	offset += height;
        	return offset;
        });
      }
    }
  });
}