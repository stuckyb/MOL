"""This module contains the MinPubSub module."""

from goog.ndb_json import encode as dumps

from collections import defaultdict
import logging

_handlers = defaultdict(list)

def subscribe(topic, handler):
    """Add a handler function for the supplied topic."""
    _handlers[topic].append(handler)

def publish(topic, data, user=None, request=None, multicast=False):
    """Publish topic to all handlers and multicast to channel if specified."""
    for handler in _handlers[topic]:
        handler(data, user)
    if multicast:
        from mol import bus # Import here to avoid a cyclical dependency.
        bus.fire(dumps(dict(topic=topic, data=data)))


