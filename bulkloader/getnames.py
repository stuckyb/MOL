import collections
import json
import urllib2
import urllib
import csv_unicode
import sqlite3
import re


def names():
    url = "http://mol.cartodb.com/api/v2/sql?q=select%20distinct(scientificname)%20from%20scientificnames%20where%20type%20=%20'protectedarea'%20or%20type%20=%20'range'%20or%20type%20=%20'ecoregion'%20or%20type='points'%20order%20by%20scientificname"
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
        for token in re.split('[^a-zA-Z0-9_]', sn):
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

def english_names():
    url = "http://mol.cartodb.com/api/v2/sql?q=SELECT%20scientific,%20common_names_eng%20as%20commons%20from%20master_taxonomy order by scientific"
    response = urllib2.urlopen(url)
    rows = json.loads(response.read())['rows']

    writer = csv_unicode.UnicodeDictWriter(open('english_names.csv', 'w'), 
                                           ['scientific', 'binomial', 'binomial_index', 
                                            'commons', 'commons_index', 'keywords', 'state', 'type'])
    writer.writeheader()

    for row in rows:
        sn = row['scientific'].strip()
        row['scientific'] = sn

        if not sn:
            row['state'] = 'NO_SN'
            writer.writerow(row)
            continue

        commons = row['commons'].strip()
        row['commons'] = commons

        if not commons:
            row['state'] = 'NO_COMMONS'
            writer.writerow(row)
            continue

        if len(sn.split()) < 2:
            row['type'] = 'MONOMIAL'

        if len(sn.split()) > 2:
            row['type'] = 'TRINOMIAL'

        if len(sn.split()) == 2:
            row['type'] = 'BINOMIAL'

        values = []
        for token in re.split('[^a-zA-Z0-9_]', sn):
            if token.isalpha():
                values.append(token.strip().lower())
            else:
                row['state'] = 'BAD_ENCODING'
                writer.writerow(row)
                continue                        
        row['binomial_index'] = reduce(lambda x,y: '%s %s' % (x, y), values[:2])
        row['binomial'] = reduce(lambda x,y: '%s %s' % (x, y), sn.split()[:2])

        commons_index = set()
        row['commons'] = reduce(lambda x,y: '%s,%s' % (x.strip(), y.strip()), commons.split(','))
        for common in row['commons'].split(','):
            values = [x for x in re.split('[^a-zA-Z0-9_]', common) if x and len(x) >= 3]
            if len(values) > 0:
                commons_index.add(reduce(
                        lambda x,y:'%s %s' % (x.lower(), y.lower()), 
                        values))
            else:
                row['state'] = 'BAD_ENCODING'

        if len(commons_index) > 0:
            row['commons_index'] = reduce(lambda x,y: '%s,%s' % (x.lower(), y.lower()), commons_index)        

        uniques = set([x for x in re.split('[^a-zA-Z0-9_]', row['commons']) if x and len(x) >= 3])
        if len(uniques) == 0:
            continue
        row['keywords'] = reduce(lambda x,y: '%s,%s' % (x.lower(), y.lower()), uniques)

        writer.writerow(row)

    print 'Done creating english_names.csv'

    
def load_results():
    url = "http://mol.cartodb.com/api/v2/sql?q=SELECT%20sn.provider%20AS%20source,%20sn.scientificname%20AS%20name,%20sn.type%20AS%20type%20FROM%20scientificnames%20sn"
    response = urllib2.urlopen(url)
    rows = json.loads(response.read())['rows']
    print 'Results downloaded.'
    results = collections.defaultdict(list)
    for row in rows:
        results[row['name'].strip()].append(row)
    
    final = {}
    for key,val in results.iteritems():
        final[key] = dict(rows=val)
    
    with open('results.json', 'w') as f:
        f.write(json.dumps(final))

def load_names():
    """Loads names.csv into a defaultdict with scientificname keys mapped to
    a list of common names."""
    global names_map
    names_map = collections.defaultdict(list)
    for row in csv_unicode.UnicodeDictReader(open('english_names.csv', 'r')):
        bi = row['binomial_index']
        names_map[bi].extend(list(set(['%s:sci' % bi.capitalize()] + ['%s:eng' % x.capitalize() for x in row['commons_index'].split(',') if x])))
    open('names_map.json', 'w').write(json.dumps(names_map))

#load_names()
#print names_map['Puma concolor']
#print names_map['Alcelaphus buselaphus']

def tokens(name):
    """Generates name keys that are at least 3 characters long.

    Example usage:
        > name_keys('concolor')
        > ['con', 'conc', 'conco', 'concol', 'concolo', 'concolor']
    """
    for n in name.split() + [name.strip().lower()]:
        name_len = len(n)
        yield n.lower()
        if name_len > 3:
            indexes = range(3, name_len)
            indexes.reverse()
            for i in indexes:
                yield n[:i].lower()

def setup_cacheitem_db():
    conn = sqlite3.connect('cacheitem.sqlite3.db', check_same_thread=False)
    c = conn.cursor()
    # Creates the cache table:
    c.execute('create table if not exists CacheItem '
              '(id string primary key, ' +
              'string text)')
    # Clears all records from the table.
    c.execute('delete from CacheItem')
    c.close()
    return conn

def create_autocomplete_index():
    names()
    english_names()
    load_names()
    writer = csv_unicode.UnicodeDictWriter(open('ac.csv', 'w'), ['id', 'string'])
    writer.writeheader()
    conn = setup_cacheitem_db()
    cur = conn.cursor()

    #count = 100

    for row in csv_unicode.UnicodeDictReader(open('names.csv', 'r')): 

        binomial = row['binomial']  

        if row['type'] == 'MONOMIAL':
            print 'skipping %s MONOMIAL' % binomial
            continue

        print 'processing %s BINOMIAL' % binomial

        bi = row['binomial_index'] # puma concolor

        if not names_map.has_key(bi):
            print '%s NO_COMMONS' % binomial
            all_names = ['%s:sci' % bi.capitalize()] 
        else:
            all_names = names_map[bi] # [mountain lion, puma, puma concolor, deer lion]

        # Search result rows for binomial_index:
        url = "http://mol.cartodb.com/api/v2/sql?%s" % urllib.urlencode(dict(q="SELECT sn.provider AS source, sn.scientificname AS name, sn.type AS type FROM scientificnames sn where scientificname = '%s'" % row['binomial']))

        try:
            response = urllib2.urlopen(url)
            if response.code != 200:
                print 'skipping %s CartoDB response error %s' % (binomial, response.code)
                continue
            rows = json.loads(response.read())['rows']
            print 'CartoDB response received for %s' % binomial
        except urllib2.HTTPError, e:
            print 'skipping because of HTTPError code: %s, url: %s' % (e.code, url)
            continue
        except urllib2.URLError, e:
            print 'skipping because of URLError reason: %s, url: %s ' % (e.reason, url)
            continue
        except:
            print 'skipping because of unknown cdb error. url: %s' % url
            continue
        
        for tagged_name in all_names:
            name, tag = tagged_name.split(':')
            for token in tokens(name): # split on ":" since names are tagged with sci or eng.
                
                # Build autocomplete index
                idname = 'acn-%s' % token.lower() # auto complete names (acn)
                result = cur.execute('SELECT * FROM CacheItem WHERE id = ?', (idname,)).fetchone()
                if result:
                    all_names_updated = list(set([tagged_name] + json.loads(result[1])))
                    cur.execute('UPDATE CacheItem SET string = ? WHERE id = ?', (json.dumps(all_names_updated), idname))
                else:
                    cur.execute('INSERT INTO CacheItem VALUES (?, ?)', (idname, json.dumps(all_names)))    
                    
                # Build search index                
                idname = 'acr-%s' % token.lower() # auto complete results (acr)
                result = cur.execute('SELECT * FROM CacheItem WHERE id = ?', (idname,)).fetchone()
                if result:
                    rows_updated = json.loads(result[1])['rows']
                    for row in rows:
                        if row not in rows_updated:
                            rows_updated.append(row)
                    cur.execute('UPDATE CacheItem SET string = ? WHERE id = ?', (json.dumps(dict(rows=rows_updated)), idname))
                else:
                    cur.execute('INSERT INTO CacheItem VALUES (?, ?)', (idname, json.dumps(dict(rows=rows))))    

        print '%s SUCCESS' % binomial
        conn.commit()
        #if count == 0:
        #    return
        #else:
        #    count = count - 1

    
    for result in cur.execute('SELECT * FROM CacheItem').fetchall():
        writer.writerow(dict(id=result[0], string=result[1]))
        
if __name__ == '__main__':
    #names()
    #english_names()
    #build_autocomplete_csv()
    #load_names()
    create_autocomplete_index()
    pass
    
        
