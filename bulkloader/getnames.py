import collections
import json
import urllib2
import csv_unicode
import sqlite3
import re


def names():
    url = "http://mol.cartodb.com/api/v2/sql?q=select%20distinct(scientificname)%20from%20scientificnames%20where%20type%20=%20'protectedarea'%20or%20type%20=%20'range'%20or%20type%20=%20'ecoregion'%20or%20type='points'%20order%20by%20scientificname"
    response = urllib2.urlopen(url)
    rows = json.loads(response.read())['rows']

    writer = csv_unicode.UnicodeDictWriter(open('names.csv', 'w'), ['keyname', 'scientificname'])
    writer.writeheader()

    bad_writer = csv_unicode.UnicodeDictWriter(open('bad_names.csv', 'w'), ['keyname', 'scientificname'])
    bad_writer.writeheader()

    for row in rows:
        if row['scientificname'].strip() == '':
            bad_writer.writerow(row)
            continue
        values = []
        for token in re.split('[^a-zA-Z0-9_]', row['scientificname']):
            if token.isalpha():
                values.append(token.lower())
        row['keyname'] = 'name-%s' % reduce(lambda x,y: '%s %s' % (x, y), values)
        if len(values) != 2: # Binomials only
            bad_writer.writerow(row)
            continue
        writer.writerow(row)
    print 'Done creating names.csv'

def english_names():
    url = "http://mol.cartodb.com/api/v2/sql?q=SELECT%20scientific,%20common_names_eng%20as%20commons%20from%20master_taxonomy order by scientific"
    response = urllib2.urlopen(url)
    rows = json.loads(response.read())['rows']
    writer = csv_unicode.UnicodeDictWriter(open('english_names.csv', 'w'), ['scientific', 'commons', 'commons_index', 'keywords'])
    writer.writeheader()
    for row in rows:
        if row['scientific'].strip() == '':
            continue
        if row['commons'].strip() == '':
            continue
        commons_index = set()
        row['scientific'] = row['scientific'].strip()
        row['commons'] = reduce(lambda x,y: '%s,%s' % (x.strip(), y.strip()), row['commons'].split(','))
        for common in row['commons'].split(','):
            values = [x for x in re.split('[^a-zA-Z0-9_]', common) if x and len(x) >= 3]
            if len(values) > 0:
                commons_index.add(reduce(
                        lambda x,y:'%s %s' % (x.lower(), y.lower()), 
                        values))
        if len(commons_index) > 0:
            row['commons_index'] = reduce(lambda x,y: '%s,%s' % (x.lower(), y.lower()), commons_index)        
        uniques = set([x for x in re.split('[^a-zA-Z0-9_]', row['commons']) if x and len(x) >= 3])
        if len(uniques) == 0:
            continue
        row['keywords'] = reduce(lambda x,y: '%s,%s' % (x.lower(), y.lower()), uniques)
        try:
            writer.writerow(row)
        except:
            print row

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
        names_map[row['scientific'].strip()].extend(list(set([x for x in row['commons_index'].split(',') if x])))
    open('names_map.json', 'w').write(json.dumps(names_map))

load_names()
print names_map['Puma concolor']
print names_map['Alcelaphus buselaphus']

def tokens(name):
    """Generates name keys that are at least 3 characters long.

    Example usage:
        > name_keys('concolor')
        > ['con', 'conc', 'conco', 'concol', 'concolo', 'concolor']
    """
    yield name.strip()
    for n in name.split():
        name_len = len(n)
        yield n
        if name_len > 3:
            indexes = range(3, name_len)
            indexes.reverse()
            for i in indexes:
                yield n[:i]

def setup_cacheitem_db():
    conn = sqlite3.connect('cacheitem.sqlite3.db', check_same_thread=False)
    c = conn.cursor()
    # Creates the cache table:
    c.execute('create table if not exists CacheItem '
              '(id text, ' +
              'string text)')
    # Clears all records from the table.
    c.execute('delete from CacheItem')
    c.close()
    return conn

def build_autocomplete_csv():
    results = json.loads(open('results.json', 'r').read())
    names = names_map
    writer = csv_unicode.UnicodeDictWriter(open('ac.csv', 'w'), ['id', 'string'])
    writer.writeheader()
    conn = setup_cacheitem_db()
    cur = conn.cursor()
    
    for sciname, record in names.iteritems(): 
       all_names = ['%s:sci' % sciname] + ['%s:eng' % x for x in record[0]['commons'].split(',')]
       for name in [sciname.lower()] + record[0]['commons_index'].split(','):
           for token in tokens(name):
               idname = 'ac-%s' % token.lower()
               result = cur.execute('SELECT * FROM CacheItem WHERE id = ?', (idname,)).fetchone()
               if result:
                   all_names = list(set(all_names + json.loads(result[1])))
                   cur.execute('UPDATE CacheItem SET string = ? WHERE id = ?', (json.dumps(all_names), idname))
               else:
                   cur.execute('INSERT INTO CacheItem VALUES (?, ?)', (idname, json.dumps(all_names)))    
       conn.commit()
    #row = dict(id=idname, string=json.dumps(all_names))
    #writer.writerow(row)
               
if __name__ == '__main__':
    names()
    #english_names()
    #build_autocomplete_csv()
    pass
    
        
