from google.appengine.api import memcache 
from google.appengine.ext import db
import random
import collections
import logging

class GeneralCounterShardConfig(db.Model):
  """Tracks the number of shards for each named counter."""
  name = db.StringProperty(required=True)
  num_shards = db.IntegerProperty(required=True, default=20)


class GeneralCounterShard(db.Model):
  """Shards for each named counter"""
  name = db.StringProperty(required=True)
  count = db.IntegerProperty(required=True, default=0)
  
            
def get_top_names(top_count, all_results):
  logging.info('%s from request' % top_count)
  d = collections.defaultdict(list)
  for counter in GeneralCounterShard.all():
    d[counter.name.split('-')[-1]].append(counter.count)
  results = {}
  for name, counts in d.iteritems():
    results[name] = reduce(lambda x,y: x+y, counts)
  top = {}
  x = collections.defaultdict(list)
  for name, count in results.iteritems():
    x[count].append(name)
  keys = x.keys()
  keys.sort()
  keys.reverse()
  tc = top_count
  for k in keys:
    if top_count > 0:
      logging.info(top_count)
      top[reduce(lambda x,y: '%s,%s' % (x,y), x[k])] = k
      top_count -= 1
    else:
      break
  logging.info(top)
  if all_results:
    return {'top-%s' % tc: top, 'results': results}
  else:
    return {'top-%s' % tc: top}

def get_count(name):
  """Retrieve the value for a given sharded counter.
  
  Parameters:
    name - The name of the counter  
  """
  total = memcache.get(name)
  if total is None:
    total = 0
    for counter in GeneralCounterShard.all().filter('name = ', name):
      total += counter.count
    memcache.add(name, total, 60)
  return total
  
def increment(name):
  """Increment the value for a given sharded counter.
  
  Parameters:
    name - The name of the counter  
  """
  config = GeneralCounterShardConfig.get_or_insert(name, name=name)
  def txn():
    index = random.randint(0, config.num_shards - 1)
    shard_name = name + str(index)
    counter = GeneralCounterShard.get_by_key_name(shard_name)
    if counter is None:
      counter = GeneralCounterShard(key_name=shard_name, name=name)
    counter.count += 1
    counter.put()
  db.run_in_transaction(txn)
  # does nothing if the key does not exist
  memcache.incr(name)
  
def increase_shards(name, num):  
  """Increase the number of shards for a given sharded counter.
  Will never decrease the number of shards.
  
  Parameters:
    name - The name of the counter
    num - How many shards to use
    
  """
  config = GeneralCounterShardConfig.get_or_insert(name, name=name)
  def txn():
    if config.num_shards < num:
      config.num_shards = num
      config.put()    
  db.run_in_transaction(txn)


