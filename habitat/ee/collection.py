# Copyright 2012 Google Inc. All Rights Reserved.

"""Common representation for ImageCollection and FeatureCollection.

This class is never intended to be instantiated by the user.
"""



# Using old-style python function naming on purpose to match the
# javascript version's naming.
# pylint: disable-msg=C6003,C6409

# We access protected members in quite a few places.  Disabling the warning.
# pylint: disable-msg=W0212

import data
import filter                   # pylint: disable-msg=W0622
import serializer


class Collection(object):
  """Baseclass for ImageCollection and FeatureCollection."""

  def __init__(self, args):
    """Constructor, only exists for testing."""
    self._description = args

  def filter(self, new_filter):
    """Add a new filter to this collection.

    Collection filtering is done by wrapping a collection in a filter
    algorithm.  As additional filters are applied to a collection, we
    try to avoid adding more wrappers and instead search for a wrapper
    we can add to, however if the collection doesn't have a filter, this
    will wrap it in one.

    Args:
      new_filter: Filter to add to this collection.

    Returns:
      The filtered collection object.
    """
    # Check if this collection already has a filter.
    if Collection._isFilterFeatureCollection(self):
      description = self._description['collection']
      new_filter = self._description['filters']._append(new_filter)
    else:
      description = self._description

    return self.__class__({
        'algorithm': 'FilterFeatureCollection',
        'collection': description,
        'filters': new_filter
        })

  def filterMetadata(self, name, operator, value):
    """Shortcut to add a metadata filter to a collection.

    This is equivalent to self.filter(Filter().metadata(...)).

    Args:
      name: Name of a property to filter.
      operator: Name of a comparison operator as defined
          by FilterCollection.  Possible values are: "equals", "less_than",
          "greater_than", "not_equals", "not_less_than", "not_greater_than",
          "starts_with", "ends_with", "not_starts_with", "not_ends_with",
          "contains", "not_contains".
      value: The value to compare against.

    Returns:
      The filter object.
    """
    return self.filter(filter.Filter().metadata_(name, operator, value))

  def filterBounds(self, geometry):
    """Shortcut to add a geometry filter to a collection.

    Items in the collection with a footprint that fails to intersect
    the given geometry will be excluded when the collection is evaluated.
    This is equivalent to self.filter(Filter().geometry(...)).

    Args:
      geometry: The boundary to filter to either as a GeoJSON geometry,
          or a FeatureCollection, from which a geometry will be extracted.

    Returns:
      The filter object.
    """
    return self.filter(filter.Filter().geometry(geometry))

  def filterDate(self, start, opt_end=None):
    """Shortcut to filter a collection with a date range.

    Items in the collection with a time_start property that doesn't
    fall between the start and end dates will be excluded.
    This is equivalent to self.filter(Filter().date(...)).

    Args:
      start: The start date as a Date object, a string representation of
          a date, or milliseconds since epoch.
      opt_end: The end date as a Date object, a string representation of
          a date, or milliseconds since epoch.

    Returns:
      The filter object.
    """
    return self.filter(filter.Filter().date(start, opt_end))

  def getInfo(self):
    """Returns all the known information about this collection.

    This function makes an REST call to to retrieve all the known information
    about this collection.

    Returns:
      The return contents vary but will include at least:
           features: an array containing metadata about the items in the
                      collection that passed all filters.
           properties: a dictionary containing the collection's metadata
                        properties.
    """
    return data.getValue({'json': self.serialize(False)})

  def serialize(self, opt_pretty=True):
    """Serialize this collection into a JSON string.

    Args:
      opt_pretty: A flag indicating whether to pretty-print the JSON.

    Returns:
      A JSON represenation of this image.
    """
    # Pop off any unused filter wrappers that might have been added by filter.
    # We copy the object here, otherwise we might accidentally knock off a
    # filter in progress.
    item = self
    while (Collection._isFilterFeatureCollection(item) and
           item._description['filters'].predicateCount() == 0):
      item = item._description['collection']
    return serializer.toJSON(item._description, opt_pretty)

  def limit(self, maximum, opt_property=None, opt_ascending=True):
    """Limit a collection to the specified number of elements.

    This limits a collection to the specified number of elements, optionally
    sorting them by a specified property first.
    NOTE: THIS IS DONE IN PLACE!

    Args:
       maximum: The number to limit the collection to.
       opt_property: The property to sort by, if sorting.
       opt_ascending: Whether to sort in ascending or descending order.
           The default is true (ascending).

    Returns:
       The collection.
    """
    args = {
        'algorithm': 'LimitFeatureCollection',
        'collection': Collection(self._description),
        'limit': maximum
        }
    if opt_property is not None:
      args['key'] = opt_property
      if opt_ascending:
        args['ascending'] = opt_ascending

    return Collection(args)

  def sort(self, prop, opt_ascending=None):
    """Sort a collection by the specified property.

    Args:
       prop: The property to sort by.
       opt_ascending: Whether to sort in ascending or descending
           order.  The default is true (ascending).

    Returns:
       The collection.
    """
    args = {
        'algorithm': 'LimitFeatureCollection',
        'collection': Collection(self._description),
        'key': prop
        }
    if opt_ascending is not None:
      args['ascending'] = opt_ascending
    return Collection(args)

  def geometry(self):
    """Run an algorithm to extract the geometry from this collection.

    Returns:
      A naked Algorithm invocation (a JSON dictionary), not an ee object,
      however this object can be used any place a Geometry object can be used.
    """
    return {'algorithm': 'ExtractGeometry', 'collection': self}

  @staticmethod
  def _isFilterFeatureCollection(collection):
    """Returns true iff the collection is wrapped with a filter."""
    return collection._description.get(
        'algorithm') == 'FilterFeatureCollection'
