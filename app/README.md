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

# Emacs

You can setup Emacs with a JavaScript REPL which is really nice for hacking on MOL code since it's mainly written in JavaScript.

If you need to install Emacs, it's easy, and here's a [great starting point](https://github.com/whizbangsystems/emacs-starter-kit). Just follow the instructions in the README.

Next, install [Rhino](http://www.mozilla.org/rhino) which is a command line interface for JavaScript. On Ubuntu:

```bash
$ sudo apt-get install rhino
```

Almost there! Next, to get the JavaScript REPL going in Emacs, let's install the `js2-mode` and `js-comint` packages using the Emacs package manager. It's easy. From within Emacs, type `M-x package-list-packages` and then hit enter. Find the packages in the list, press the `i` key next to each one, and then press the `x` key to install. 

The last step is adding the following to the end of your `~/.emacs.d/init.el` configuration file:

```clojure
(require 'js-comint)
(setq inferior-js-program-command "/usr/bin/js")
(add-hook 'js2-mode-hook '(lambda () 
        		    (local-set-key "\C-x\C-e" 'js-send-last-sexp)
			    (local-set-key "\C-\M-x" 'js-send-last-sexp-and-go)
			    (local-set-key "\C-cb" 'js-send-buffer)
			    (local-set-key "\C-c\C-b" 'js-send-buffer-and-go)
			    (local-set-key "\C-cl" 'js-load-file-and-go)
			    ))
```

That's it! Restart Emacs, and then type `M-x run-js` and you are SET!



