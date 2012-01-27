# Developing the app

This is Map of Life web app. It's built using HTML5, CSS, and JavaScript. It rides on the Google App Engine platform for hosting, and leverages a hosted instance of [CartoDB](https://github.com/vizzuality/cartodb) by sending it CORS requests to the [Maps API](http://developers.cartodb.com/api/maps.html) and [SQL API](http://developers.cartodb.com/api/sql.html).

# Ubuntu environment

The app is hosted on GitHub, so we'll need to have the [Git](http://git-scm.com) client installed:

```bash
$ sudo apt-get install git
```

Next, let's go ahead and clone the project to our computer:

```bash
$ git clone git@github.com:MapofLife/MOL.git
```
        
To run the app locally for development, we need to install Python 2.7 and the latest Google App Engine Python SDK.

```bash
# Install Python 2.7
$ sudo apt-get update
$ sudo apt-get install python2.7

# Install Google App Engine Python SDK
$ mkdir ~/bin
$ cd ~/bin
$ curl -O http://googleappengine.googlecode.com/files/google_appengine_1.6.1.zip
$ unzip google_appengine_1.6.1.zip
$ export PATH=$PATH:~/bin/google_appengine # Add this line to ~/.bashrc
```

Finally, get into the `/app` directory, and let's fire up the development server!

```bash
$ cd MOL/app
$ dev_appserver.py ./
```

BOOM! You should be able to access the app at [http://localhost:8080](http://localhost:8080).

# Development workflow

TODO...





