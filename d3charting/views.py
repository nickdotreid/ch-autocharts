from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect
from django.core.urlresolvers import reverse
import json

from StringIO import StringIO  
from zipfile import ZipFile

from django.template import RequestContext

from django import forms
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout
from crispy_forms.layout import Submit, Div

import xlrd

import cairosvg

class ExcelUploadForm(forms.Form):

    def __init__(self, *args, **kwargs):
        super(ExcelUploadForm, self).__init__(*args, **kwargs)
        self.helper = FormHelper(self)
        self.helper.form_method = "POST"
        self.helper.form_action = reverse(index)

        self.helper.form_class = 'form-horizontal'
        self.helper.label_class = 'col-lg-2'
        self.helper.field_class = 'col-lg-8'

        self.helper.layout = Layout(
            'file',
            Submit('submit', 'Submit'),
            )

    file = forms.FileField(required=True)

EXPORT_TYPES = (
        ('svg','SVG'),
        ('png','PNG'),
        )

class SVGDownloadForm(forms.Form):
    filename = forms.CharField(widget=forms.HiddenInput)
    filetype = forms.ChoiceField(choices=EXPORT_TYPES)
    svg = forms.CharField(widget=forms.HiddenInput)

class SpecialSVGDownloadForm(SVGDownloadForm):
    def __init__(self, data=None, targets=[], *args, **kwargs):
        super(SpecialSVGDownloadForm, self).__init__(data ,*args, **kwargs)
        self.helper = FormHelper(self)
        self.helper.form_id = "svgform"
        self.helper.form_method = "POST"
        self.helper.form_action = reverse(save)

        target_choices = [("","Select a target")]
        for target in targets:
            target_choices.append((target,target))
        self.fields['target'] = forms.ChoiceField(required=False, choices=target_choices)

        self.helper.layout = Layout(
            'formtype',
            'label',
            'target',
            Div(
                Div('width', css_class="col-md-4"),
                Div('height', css_class="col-md-4"),
                Div('padding', css_class="col-md-4"),
                css_class="row",
                ),
            Div(
                Div(
                    'min',
                    css_class="col-md-4",
                    ),
                Div(
                    'max',
                    css_class="col-md-4",
                    ),
                Div(
                    'ticks',
                    css_class="col-md-4",
                    ),
                css_class="row",
                ),
            'filetype',
            'filename',
            'svg',
            Submit('submit', 'Download'),
            )
    formtype = forms.ChoiceField(required = False, label="Graph Type", choices=(
        ('horizontal','Horizontal'),
        ('vertical','Vertical'),
        ))
    height = forms.CharField(required = False, label="Chart height")
    width = forms.CharField(required = False, label="Chart width")
    padding = forms.CharField(required = False, label="Padding")
    min = forms.CharField(required = False, label="Min axis")
    max = forms.CharField(required = False, label="Max axis")
    ticks = forms.CharField(required = False, label="# of ticks")
    label = forms.CharField(required=False, label="Axis label")

def parse_worksheet(sheet):
    metadata = {
        'filetype':EXPORT_TYPES[0][0],
    }
    data = []
    item_keys = {}
    current_value = {}
    group_num = 0

    for row_num in range(0,sheet.nrows):
        values = sheet.row(row_num)
        if not values[0].value and values[1].value and len(item_keys.keys()) < 1:
            for num, cell in enumerate(values):
                if not cell.value:
                    continue
                if cell.value.lower() in ['hi']:
                    current_value['high'] = num
                elif cell.value.lower() in ['lo']:
                    current_value['low'] = num
                else:
                    current_value = {
                        'value':num
                    }
                    name = cell.value.encode('ascii', 'ignore')
                    item_keys[name] = current_value
        elif len(item_keys) < 1:
            metadata[values[0].value] = values[1].value
        else:
            if not values[0].value:
                group_num += 1
                continue
            for key in item_keys:
                d = {
                    'name':values[0].value.encode('ascii', 'ignore'),
                    'group':group_num,
                }
                key_values = item_keys[key]
                d['value_name'] = key
                d['value'] = values[key_values['value']].value
                if 'high' in key_values:
                    d['high'] = values[key_values['high']].value
                if 'low' in key_values:
                    d['low'] = values[key_values['low']].value
                data.append(d)
    return data, metadata

def index(request):
    form = ExcelUploadForm()
    data = False
    if request.POST:
        form = ExcelUploadForm(request.POST, request.FILES)
        if form.is_valid():
            xls = request.FILES['file']
            book = xlrd.open_workbook(file_contents = xls.read())

            charts = []
            for name in book.sheet_names():
                data, metadata = parse_worksheet(book.sheet_by_name(name))
                keys = [d['name'] for d in data]
                charts.append({
                    'name':name,
                    'data':data,
                    'form':SpecialSVGDownloadForm(metadata, targets=keys),
                    })
            return render_to_response('charts.html',{
                'charts':charts,
                },context_instance=RequestContext(request))
    return render_to_response('index.html',{
        'form':form,
        },context_instance=RequestContext(request))

def upload(request):
    return HttpResponse("")

def save(request):
    if not request.POST:
        return HttpResponseRedirect(reverse(index))
    form = SVGDownloadForm(request.POST)
    if not form.is_valid():
        return HttpResponseRedirect(reverse(index))
    filename = form.cleaned_data['filename']
    if form.cleaned_data['filetype'] == 'png':
        image_data = cairosvg.svg2png(form.cleaned_data['svg'])
        response = HttpResponse(image_data, mimetype="image/png")
        response['Content-Disposition'] = 'attachment; filename="%s.png"' % (filename)
        return response
    response = HttpResponse(form.cleaned_data['svg'],mimetype="image/svg")
    response['Content-Disposition'] = 'attachment; filename="%s.svg"' % (filename)
    return response

def save_all(request):
    if not request.POST and not request.is_ajax:
        return HttpResponseRedirect(reverse(index))

    in_memory = StringIO()  
    zip = ZipFile(in_memory, "a")

    for name in request.POST:
        if name == 'csrfmiddlewaretoken':
            continue
        try:
            svg_data = request.POST[name]
            zip.writestr("%s.svg" % (name), cairosvg.svg2svg(svg_data))
            zip.writestr("%s.png" % (name), cairosvg.svg2png(svg_data))
        except:
            print name + " broke while running"
            pass

    # fix for Linux zip files read in Windows  (I dont know what this actually does)
    for file in zip.filelist:  
        file.create_system = 0 
    zip.close()

    response = HttpResponse(mimetype="application/zip")  
    response["Content-Disposition"] = "attachment; filename=charts.zip"  
      
    in_memory.seek(0)      
    response.write(in_memory.read())  

    return response
