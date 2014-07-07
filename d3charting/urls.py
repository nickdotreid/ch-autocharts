from django.conf.urls import patterns, include, url

urlpatterns = patterns('d3charting.views',
	url(r'^download/all','save_all'),
	url(r'^download','save'),
	url(r'^upload','upload'),
	url(r'^','index'),
)