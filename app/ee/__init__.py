# Copyright 2012 Google Inc. All Rights Reserved.

"""The EE Javascript library."""



import logging
import re
import urllib
import urllib2

import oauth2client.client

#pylint: disable-msg=C6203
import data
import algorithms

# We're explictly importing the objects so they become available in this.
#pylint: disable-msg=C6202
from collection import Collection
from featurecollection import FeatureCollection
from feature import Feature
from filter import Filter
from imagecollection import ImageCollection
from image import Image


CLIENT_LOGIN_URL = 'https://www.google.com/accounts/ClientLogin'

OAUTH2_SCOPE = 'https://www.googleapis.com/auth/earthengine.readonly'


def Initialize(credentials=None, opt_url=None):
  """Initialize the EE library.

  Args:
    credentials: OAuth2 or ClientLogin credentials.
    opt_url: The base url for the EarthEngine REST API to connect to.
  """
  if isinstance(credentials, basestring):
    # TODO(user): Remove this deprecated option altogether.  Google
    # officially deprecated ClientLogin in April, 2012.
    data.CLIENT_LOGIN_TOKEN = credentials
  else:
    data.CREDENTIALS = credentials
  if opt_url is not None:
    data.BASE_URL = opt_url + '/api'
    data.TILE_URL = opt_url

  #pylint: disable-msg=W0212
  algorithms._addFunctions(Image, 'Image')
  algorithms._addFunctions(Feature, 'Feature')
  algorithms._addFunctions(FeatureCollection, 'FeatureCollection')
  algorithms._addFunctions(Image, 'Window', 'focal_')
  algorithms._addFunctions(ImageCollection, 'reduce')
  algorithms._addFunctions(Collection, 'Collection')
  algorithms._addFunctions(Collection,
                           'AggregateFeatureCollection',
                           'aggregate_',
                           algorithms._makeAggregateFunction)
  algorithms._addFunctions(ImageCollection,
                           'Image',
                           'map_',
                           algorithms._makeMapFunction)
  algorithms._addFunctions(FeatureCollection,
                           'Feature',
                           'map_',
                           algorithms._makeMapFunction)


def ServiceAccountCredentials(email, key_file):
  """Configure OAuth2 credentials for a Google Service Account.

  Args:
    email: The email address of the account for which to configure credentials.
    key_file: The path to a file containing the private key associated with
        the service account.

  Returns:
    An OAuth2 credentials object.
  """
  private_key = open(key_file).read()
  return oauth2client.client.SignedJwtAssertionCredentials(
      email, private_key, OAUTH2_SCOPE)


def ClientLogin(email, password):
  """Get an authorization token for the given Google account via ClientLogin."""
  payload = urllib.urlencode({
      'Email': email,
      'Passwd': password,
      'service': 'gestalt'
      })

  req = urllib2.Request(url=CLIENT_LOGIN_URL, data=payload)
  try:
    response = urllib2.urlopen(req).read()
  except urllib2.HTTPError, e:
    logging.error('Server Error: %d', e.code)
    raise e
  except urllib2.URLError, e:
    logging.error('Unexpected HTTP response: %s', e.reason)
    raise e

  auth = [x for x in response.splitlines() if x.startswith('Auth=')]
  if auth:
    return auth[0][5:]
  else:
    raise Exception('Client login failed.')


def call(algorithm, *args, **kwargs):           # pylint: disable-msg=C6409
  """Invoke the given algorithm with the specified args.

  Args:
    algorithm: The name of the algorithm to invoke.
    *args: The positional arguments to pass to the specified algorithm.
    **kwargs: The named arguments to pass to the specified algorithm.

  Returns:
    The algorithm result.  This is cast to the appropriate type if it's
    recognized.  Otherwise, a dictionary representing the algorithm
    invocation JSON is returned.
  """
  signature = algorithms.getSignature(algorithm)

  # pylint: disable-msg=W0212
  return algorithms._applySignature(signature, *args, **kwargs)


def apply(algorithm, namedArgs):               # pylint: disable-msg=C6409,W0622
  """Invoke the given algorithm with a dictionary of args.

  Args:
    algorithm: The name of an algorithm to invoke.
    namedArgs: A dictionary of named arguments to pass to the given algorithm.

  Returns:
    The algorithm result.  This is cast to the appropriate type if it's
    recognized.  Otherwise, a dictionary representing the algorithm
    invocation JSON is returned.
  """
  signature = algorithms.getSignature(algorithm)

  # pylint: disable-msg=W0212
  return algorithms._applySignature(signature, **namedArgs)
