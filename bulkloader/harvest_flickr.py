import collections
import json
import urllib2
import urllib
import csv_unicode
import sqlite3
import re

from Queue import Queue
import threading

"""This module harvests EOL image JSON results for binomials and outputs a CSV
with name,result columns.
"""

def names():
    "Download all binomials from CartoDB and store in CSV file"
    print 'Getting names...'
    url = "http://mol.cartodb.com/api/v2/sql?q=select%20n%20as%20scientificname%20from%20ac%20order%20by%20scientificname"
    response = urllib2.urlopen(url)
    rows = json.loads(response.read())['rows']

    writer = csv_unicode.UnicodeDictWriter(open('names.csv', 'w'),
                                           ['scientificname', 'binomial', 'binomial_index', 'state', 'type'])
    writer.writeheader()

    for row in rows:
        sn = row['scientificname'].strip()
        row['scientificname'] = sn

        if not sn:
            row['state'] = 'NO_NAME'
            writer.writerow(row)
            continue

        if len(sn.split()) < 2:
            row['type'] = 'MONOMIAL'

        if len(sn.split()) > 2:
            row['type'] = 'TRINOMIAL'

        if len(sn.split()) == 2:
            row['type'] = 'BINOMIAL'

        values = []
        for token in re.split('[^a-zA-Z0-9_-]', sn):
            if token.isalpha():
                values.append(token.lower())
            else:
                row['state'] = 'BAD_ENCODING'
                writer.writerow(row)
                continue
        row['binomial_index'] = reduce(lambda x,y: '%s %s' % (x, y), values[:2])
        row['binomial'] = reduce(lambda x,y: '%s %s' % (x, y), sn.split()[:2])

        writer.writerow(row)

    print 'Done creating names.csv'

class Query(object):
    "Class that encapsulates work related to harvesting a Flickr image result."

    def __init__(self, q, writer):
        self.q = q
        self.writer = writer

    def get_flickr(self, url, name):
        "Download URL and return response content."
        try:
            response = urllib2.urlopen(url)
            if response.code != 200 and response.code != 304: # OK or NOT MODIFIED
                print 'skipping %s Flickr response error %s' % (name, response.code)
            content = json.loads(response.read())
            #print 'Flickr response received for %s' % name
            return content
        except urllib2.HTTPError, e:
            print 'skipping because of HTTPError code: %s, url: %s' % (e.code, url)
        except urllib2.URLError, e:
            print 'skipping because of URLError reason: %s, url: %s ' % (e.reason, url)

    def execute(self, name):
        "Write image result to CSV."
        try:
            result = None
            url_sq = None
            url_o = None
            url_m = None
            jsonStr = None
            flickr_url = 'http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=9e1987871bbe32244303a45a42763f08&safe_search=1&per_page=1&extras=url_sq,url_m,url_o&format=json&nojsoncallback=1&tags=%s' % urllib.quote(name)
            result = self.get_flickr(flickr_url, name) #self.get_flickr(flickr_url, name)
            if result:
                if result['photos']['photo'][0]:
                    url_sq = result['photos']['photo'][0]['url_sq']
                    url_o = result['photos']['photo'][0]['url_o']
                    url_m = result['photos']['photo'][0]['url_m']
                    self.writer.writerow(dict(name=name, bookmarkurl=url_sq, originalurl=url_o, mediumurl=url_m, result=json.dumps(result)))
                    print "Harvested Flickr image for %s" % name
        except Exception, e:
                foo = None
                #print "Unable to harvest Flickr image for %s" % name

    def loop(self):
        while True:
            # Fetch a name from the queue and run the query
            r = self.q.get()
            if r == None:
                self.q.task_done()
                break
            else:
                (name) = r
            self.execute(name)
            self.q.task_done()

def cache_flickr():
    "Cache Flickr image JSON responses for all names in names.csv"
    writer = csv_unicode.UnicodeDictWriter(open('flickr_images.csv', 'w'), ['name', 'bookmarkurl', 'originalurl', 'mediumurl'])
    writer.writeheader()

    count = 10

    queue = Queue()
    renderers = {}
    num_threads = 100
    for i in range(num_threads): # number of threads
        renderer = Query(queue, writer)
        render_thread = threading.Thread(target=renderer.loop)
        render_thread.start()
        renderers[i] = render_thread

    for row in csv_unicode.UnicodeDictReader(open('names.csv', 'r')):

        binomial = row['binomial']

        if row['type'] == 'MONOMIAL':
            print 'skipping %s MONOMIAL' % binomial
            continue

        bi = row['binomial_index'] # puma concolor

        queue.put(row['binomial'])

    for i in range(num_threads):
        queue.put(None)
    # wait for pending rendering jobs to complete
    queue.join()
    for i in range(num_threads):
        renderers[i].join()

if __name__ == '__main__':
    names()
    cache_flickr()
    pass

