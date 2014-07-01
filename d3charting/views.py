from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect
from django.core.urlresolvers import reverse
import json

from django.template import RequestContext

from django import forms
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout
from crispy_forms.layout import Submit

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

class SVGDownloadForm(forms.Form):
    def __init__(self, *args, **kwargs):
        super(SVGDownloadForm, self).__init__(*args, **kwargs)
        self.helper = FormHelper(self)
        self.helper.form_id = "svgform"
        self.helper.form_method = "POST"
        self.helper.form_action = reverse(save)

        self.helper.form_class = 'form-horizontal'
        self.helper.label_class = 'col-lg-2'
        self.helper.field_class = 'col-lg-8'

        self.helper.layout = Layout(
            'filetype',
            'svg',
            Submit('submit', 'Download'),
            )
    filetype = forms.ChoiceField(choices=(
        ('svg','SVG'),
        ('png','PNG'),
        ))
    svg = forms.CharField()

def index(request):
    form = ExcelUploadForm()
    data = False
    if request.POST:
        form = ExcelUploadForm(request.POST, request.FILES)
        if form.is_valid():
            xls = request.FILES['file']
            book = xlrd.open_workbook(file_contents = xls.read())
            worksheet_names = book.sheet_names()
            sheet = book.sheet_by_name(worksheet_names[0])
            data = []
            item_keys = {}
            for num, cell in enumerate(sheet.row(0)):
                if not cell.value:
                    continue
                if 'percent' in cell.value.lower():
                    item_keys[num] = 'percent'
                elif 'hi' in cell.value.lower():
                    item_keys[num] = 'high'
                elif 'lo' in cell.value.lower():
                    item_keys[num] = 'low'
                else:
                    item_keys[num] = cell.value
            for row_num in range(1,sheet.nrows):
                values = sheet.row(row_num)
                if not values[0].value:
                    continue
                d = {
                    'name':values[0].value
                }
                for key in item_keys:
                    if item_keys[key] in ['low', 'high', 'percent'] and not values[key].value:
                        d[item_keys[key]] = 0
                    else:
                        d[item_keys[key]] = values[key].value
                data.append(d)
    return render_to_response('index.html',{
        'form':form,
        'svgform':SVGDownloadForm(),
        'data':json.dumps(data),
        },context_instance=RequestContext(request))

def upload(request):
    return HttpResponse("")

def save(request):
    if not request.POST:
        return HttpResponseRedirect(reverse(index))
    form = SVGDownloadForm(request.POST)
    if not form.is_valid():
        return HttpResponseRedirect(reverse(index))
    if form.cleaned_data['filetype'] == 'png':
        image_data = cairosvg.svg2png(form.cleaned_data['svg'])
        response = HttpResponse(image_data, mimetype="image/png")
        response['Content-Disposition'] = 'attachment; filename="foo.png"'
        return response
    response = HttpResponse(form.cleaned_data['svg'],mimetype="image/svg")
    response['Content-Disposition'] = 'attachment; filename="foo.svg"'
    return response