from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect
from django.core.urlresolvers import reverse
import json

from django.template import RequestContext

def index(request):
    return render_to_response('index.html',{},context_instance=RequestContext(request))

def upload(request):
    return HttpResponse("")

def save(request):
    if not request.POST:
        return HttpResponseRedirect(reverse(index))
    # do some magic to turn an SVG into a PNG (or download the SVG)