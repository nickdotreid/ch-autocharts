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
                if cell.value:
                    item_keys[num] = cell.value
            print item_keys
            for row_num in range(1,sheet.nrows):
                values = sheet.row(row_num)
                if not values[0].value:
                    continue
                d = {
                    'name':values[0].value
                }
                for key in item_keys:
                    d[item_keys[key]] = values[key].value
                data.append(d)
    return render_to_response('index.html',{
        'form':form,
        'data':json.dumps(data),
        },context_instance=RequestContext(request))

def upload(request):
    return HttpResponse("")

def save(request):
    if not request.POST:
        return HttpResponseRedirect(reverse(index))
    # do some magic to turn an SVG into a PNG (or download the SVG)